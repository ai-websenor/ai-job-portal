import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { and, or, eq, ne, gte, lte, ilike, inArray, desc, sql, exists } from 'drizzle-orm';
import {
  Database,
  profiles,
  jobPreferences,
  profileSkills,
  skills,
  workExperiences,
  employers,
  savedCandidates,
} from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';
import { SearchCandidatesDto, SaveCandidateDto } from './dto';

// Columns selected for a candidate card; shared by search and saved-list queries
const candidateCardColumns = {
  id: profiles.id,
  firstName: profiles.firstName,
  lastName: profiles.lastName,
  headline: profiles.headline,
  city: profiles.city,
  state: profiles.state,
  country: profiles.country,
  profilePhoto: profiles.profilePhoto,
  totalExperienceYears: profiles.totalExperienceYears,
  expectedSalaryMin: jobPreferences.expectedSalaryMin,
  expectedSalaryMax: jobPreferences.expectedSalaryMax,
  salaryCurrency: jobPreferences.salaryCurrency,
  noticePeriodDays: jobPreferences.noticePeriodDays,
};

type CandidateCardRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  headline: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  profilePhoto: string | null;
  totalExperienceYears: string | null;
  expectedSalaryMin: string | null;
  expectedSalaryMax: string | null;
  salaryCurrency: string | null;
  noticePeriodDays: number | null;
  isSaved: boolean;
};

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class CandidateSearchService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Map an experience-level bucket token to a numeric range condition on totalExperienceYears.
   */
  private experienceBucketCondition(bucket: string) {
    const col = profiles.totalExperienceYears;
    switch (bucket) {
      case '0-1':
        return and(gte(col, '0'), lte(col, '1'));
      case '1-2':
        return and(gte(col, '1'), lte(col, '2'));
      case '3-5':
        return and(gte(col, '3'), lte(col, '5'));
      case '5-10':
        return and(gte(col, '5'), lte(col, '10'));
      case '10+':
        return gte(col, '10');
      default:
        return undefined;
    }
  }

  /**
   * Map an availability token to a notice-period condition on noticePeriodDays.
   */
  private availabilityCondition(token: string) {
    const col = jobPreferences.noticePeriodDays;
    switch (token) {
      case 'immediate':
        return eq(col, 0);
      case '15d':
        return lte(col, 15);
      case '30d':
        return lte(col, 30);
      case 'notice':
        return sql`${col} > 30`;
      default:
        return undefined;
    }
  }

  private availabilityLabel(noticePeriodDays: number | null): string {
    if (noticePeriodDays === null || noticePeriodDays === undefined) return 'Not specified';
    if (noticePeriodDays === 0) return 'Immediate Joiner';
    if (noticePeriodDays <= 15) return 'Within 15 Days';
    if (noticePeriodDays <= 30) return 'Within 30 Days';
    return 'Notice Period';
  }

  /**
   * Build the array of WHERE conditions shared by the page query and the count query.
   */
  private buildConditions(dto: SearchCandidatesDto) {
    const conditions: any[] = [
      // Never expose candidates who marked their profile private
      ne(profiles.visibility, 'private'),
    ];

    if (dto.query) {
      const q = `%${dto.query}%`;
      conditions.push(
        or(
          ilike(profiles.firstName, q),
          ilike(profiles.lastName, q),
          ilike(profiles.headline, q),
          exists(
            this.db
              .select({ x: sql`1` })
              .from(profileSkills)
              .innerJoin(skills, eq(profileSkills.skillId, skills.id))
              .where(and(eq(profileSkills.profileId, profiles.id), ilike(skills.name, q))),
          ),
          exists(
            this.db
              .select({ x: sql`1` })
              .from(workExperiences)
              .where(
                and(eq(workExperiences.profileId, profiles.id), ilike(workExperiences.jobTitle, q)),
              ),
          ),
        ),
      );
    }

    if (dto.location) {
      const loc = `%${dto.location}%`;
      conditions.push(
        or(ilike(profiles.city, loc), ilike(profiles.state, loc), ilike(profiles.country, loc)),
      );
    }

    if (dto.experienceLevels?.length) {
      const buckets = dto.experienceLevels
        .map((b) => this.experienceBucketCondition(b))
        .filter(Boolean);
      if (buckets.length) conditions.push(or(...buckets));
    }

    if (dto.salaryMin !== undefined) {
      // Candidate's max expected salary must reach at least the requested floor
      conditions.push(gte(jobPreferences.expectedSalaryMax, String(dto.salaryMin)));
    }
    if (dto.salaryMax !== undefined) {
      // Candidate's min expected salary must be within the requested ceiling
      conditions.push(lte(jobPreferences.expectedSalaryMin, String(dto.salaryMax)));
    }

    if (dto.employmentTypes?.length) {
      conditions.push(
        or(...dto.employmentTypes.map((t) => ilike(jobPreferences.jobTypes, `%${t}%`))),
      );
    }

    if (dto.availability?.length) {
      const avail = dto.availability.map((a) => this.availabilityCondition(a)).filter(Boolean);
      if (avail.length) conditions.push(or(...avail));
    }

    if (dto.skillIds?.length) {
      conditions.push(
        exists(
          this.db
            .select({ x: sql`1` })
            .from(profileSkills)
            .where(
              and(
                eq(profileSkills.profileId, profiles.id),
                inArray(profileSkills.skillId, dto.skillIds),
              ),
            ),
        ),
      );
    }

    return conditions;
  }

  private buildOrderBy(sortBy?: string) {
    switch (sortBy) {
      case 'recent':
        return [desc(profiles.createdAt)];
      case 'experience':
        return [desc(profiles.totalExperienceYears)];
      case 'salary':
        return [desc(jobPreferences.expectedSalaryMax)];
      case 'relevance':
      default:
        // Promoted profiles first, then most recently updated
        return [desc(profiles.isPromoted), desc(profiles.createdAt)];
    }
  }

  /** Resolve the employer row id for a given user id, or null if none exists. */
  private async resolveEmployerId(userId?: string): Promise<string | null> {
    if (!userId) return null;
    const emp = await this.db
      .select({ id: employers.id })
      .from(employers)
      .where(eq(employers.userId, userId))
      .limit(1);
    return emp[0]?.id ?? null;
  }

  /** Sign photos and attach grouped skills to candidate card rows. */
  private async shapeCandidates(rows: CandidateCardRow[]) {
    const profileIds = rows.map((r) => r.id);
    const skillMap = new Map<string, string[]>();
    if (profileIds.length) {
      const skillRows = await this.db
        .select({ profileId: profileSkills.profileId, name: skills.name })
        .from(profileSkills)
        .innerJoin(skills, eq(profileSkills.skillId, skills.id))
        .where(inArray(profileSkills.profileId, profileIds))
        .orderBy(profileSkills.displayOrder);
      for (const s of skillRows) {
        const list = skillMap.get(s.profileId) || [];
        list.push(s.name);
        skillMap.set(s.profileId, list);
      }
    }

    return Promise.all(
      rows.map(async (r) => {
        const location = [r.city, r.state].filter(Boolean).join(', ') || r.country || null;
        const profilePhoto = r.profilePhoto
          ? await this.s3Service.getSignedDownloadUrlFromKeyOrUrl(r.profilePhoto)
          : null;
        return {
          profileId: r.id,
          name: [r.firstName, r.lastName].filter(Boolean).join(' ') || null,
          headline: r.headline,
          location,
          profilePhoto,
          totalExperienceYears: r.totalExperienceYears,
          expectedSalaryMin: r.expectedSalaryMin,
          expectedSalaryMax: r.expectedSalaryMax,
          salaryCurrency: r.salaryCurrency,
          noticePeriodDays: r.noticePeriodDays,
          availability: this.availabilityLabel(r.noticePeriodDays),
          skills: skillMap.get(r.id) || [],
          isSaved: r.isSaved,
        };
      }),
    );
  }

  async searchCandidates(userId: string | undefined, dto: SearchCandidatesDto) {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const limit = dto.limit && dto.limit > 0 ? dto.limit : 10;
    const offset = (page - 1) * limit;

    // Resolve the employer making the request so we can flag already-saved candidates
    const employerId = (await this.resolveEmployerId(userId)) ?? NIL_UUID;

    const conditions = this.buildConditions(dto);
    const orderBy = this.buildOrderBy(dto.sortBy);

    const rows = await this.db
      .select({
        ...candidateCardColumns,
        isSaved: sql<boolean>`${savedCandidates.id} IS NOT NULL`,
      })
      .from(profiles)
      .leftJoin(jobPreferences, eq(jobPreferences.profileId, profiles.id))
      .leftJoin(
        savedCandidates,
        and(eq(savedCandidates.profileId, profiles.id), eq(savedCandidates.employerId, employerId)),
      )
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql<number>`count(distinct ${profiles.id})` })
      .from(profiles)
      .leftJoin(jobPreferences, eq(jobPreferences.profileId, profiles.id))
      .where(and(...conditions));

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    const data = await this.shapeCandidates(rows);

    return {
      data,
      pagination: {
        totalCandidate: total,
        pageCount: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
      },
    };
  }

  /** Save (shortlist) a candidate for the employer. Idempotent — updates note on re-save. */
  async saveCandidate(userId: string, dto: SaveCandidateDto) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) throw new BadRequestException('Employer profile not found');

    const profile = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, dto.profileId))
      .limit(1);
    if (!profile[0]) throw new NotFoundException('Candidate profile not found');

    await this.db
      .insert(savedCandidates)
      .values({ employerId, profileId: dto.profileId, note: dto.note })
      .onConflictDoUpdate({
        target: [savedCandidates.employerId, savedCandidates.profileId],
        set: { note: dto.note ?? null },
      });

    return { message: 'Candidate saved successfully', data: { profileId: dto.profileId } };
  }

  /** Remove a saved candidate for the employer. */
  async unsaveCandidate(userId: string, profileId: string) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) throw new BadRequestException('Employer profile not found');

    const deleted = await this.db
      .delete(savedCandidates)
      .where(
        and(eq(savedCandidates.employerId, employerId), eq(savedCandidates.profileId, profileId)),
      )
      .returning({ id: savedCandidates.id });

    if (!deleted[0]) throw new NotFoundException('Saved candidate not found');
    return { message: 'Candidate removed from saved list', data: { profileId } };
  }

  /** List candidates saved by the employer, paginated, using the same card shape as search. */
  async listSavedCandidates(userId: string, page = 1, limit = 10) {
    const employerId = await this.resolveEmployerId(userId);
    if (!employerId) throw new BadRequestException('Employer profile not found');

    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? limit : 10;
    const offset = (safePage - 1) * safeLimit;

    const rows = await this.db
      .select({ ...candidateCardColumns, isSaved: sql<boolean>`true` })
      .from(savedCandidates)
      .innerJoin(profiles, eq(profiles.id, savedCandidates.profileId))
      .leftJoin(jobPreferences, eq(jobPreferences.profileId, profiles.id))
      .where(eq(savedCandidates.employerId, employerId))
      .orderBy(desc(savedCandidates.createdAt))
      .limit(safeLimit)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(savedCandidates)
      .where(eq(savedCandidates.employerId, employerId));

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / safeLimit);

    const data = await this.shapeCandidates(rows);

    return {
      data,
      pagination: {
        totalCandidate: total,
        pageCount: totalPages,
        currentPage: safePage,
        hasNextPage: safePage < totalPages,
      },
    };
  }
}
