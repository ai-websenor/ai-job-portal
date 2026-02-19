import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { Database, profiles, skills, profileSkills } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import {
  AddProfileSkillDto,
  BulkAddProfileSkillDto,
  UpdateProfileSkillDto,
  SkillQueryDto,
  AdminSkillQueryDto,
  UpdateMasterSkillDto,
  ProficiencyLevel,
} from './dto';
import { updateOnboardingStep, recalculateOnboardingCompletion } from '../utils/onboarding.helper';

@Injectable()
export class SkillService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile.id;
  }

  // Master skills list (public - returns only active, master-typed for suggestions)
  async getAllSkills(query: SkillQueryDto) {
    let whereClause = and(eq(skills.isActive, true), eq(skills.type, 'master-typed'))!;

    if (query.category) {
      whereClause = and(whereClause, eq(skills.category, query.category as any))!;
    }

    if (query.search) {
      whereClause = and(whereClause, ilike(skills.name, `%${query.search}%`))!;
    }

    return this.db.query.skills.findMany({
      where: whereClause,
      orderBy: (s, { asc }) => [asc(s.name)],
    });
  }

  // Admin: paginated list of all skills (master + user-typed), active only
  async getAllSkillsAdmin(query: AdminSkillQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const offset = (page - 1) * limit;

    let whereClause: any = eq(skills.isActive, true);

    if (query.type) {
      whereClause = and(whereClause, eq(skills.type, query.type as any));
    }

    if (query.search) {
      whereClause = and(whereClause, ilike(skills.name, `%${query.search}%`));
    }

    const [rows, totalRows] = await Promise.all([
      this.db.query.skills.findMany({
        where: whereClause,
        orderBy: (s, { asc }) => [asc(s.type), asc(s.name)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(skills)
        .where(whereClause ?? sql`true`)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows,
      meta: {
        total: totalRows,
        page,
        limit,
        totalPages: Math.ceil(totalRows / limit),
      },
    };
  }

  // Admin: create a master skill
  async createMasterSkill(dto: { name: string; category?: string }) {
    const [skill] = await this.db
      .insert(skills)
      .values({
        name: dto.name.trim(),
        category: (dto.category as any) || 'industry_specific',
        type: 'master-typed',
        isActive: true,
      })
      .returning();
    return skill;
  }

  // Admin: update a master skill
  async updateSkill(id: string, dto: UpdateMasterSkillDto) {
    const existing = await this.db.query.skills.findFirst({
      where: eq(skills.id, id),
    });
    if (!existing) throw new NotFoundException('Skill not found');

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.category !== undefined) updateData.category = dto.category;

    const [updated] = await this.db
      .update(skills)
      .set(updateData)
      .where(eq(skills.id, id))
      .returning();

    return updated;
  }

  // Admin: delete a skill (hard delete if unused, soft delete if referenced by profiles)
  async deleteSkill(id: string) {
    const existing = await this.db.query.skills.findFirst({
      where: eq(skills.id, id),
    });
    if (!existing) throw new NotFoundException('Skill not found');

    const usageCount = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(profileSkills)
      .where(eq(profileSkills.skillId, id))
      .then((r) => r[0]?.count ?? 0);

    if (usageCount > 0) {
      // Skill is in use — soft delete so existing profiles keep it
      await this.db
        .update(skills)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(skills.id, id));
      return {
        success: true,
        softDeleted: true,
        message: `Skill is used by ${usageCount} profile(s). It has been deactivated and will no longer appear in suggestions.`,
      };
    }

    await this.db.delete(skills).where(eq(skills.id, id));
    return { success: true, softDeleted: false };
  }

  // Helper to add a single skill to profile
  private async addSkillToProfile(profileId: string, dto: AddProfileSkillDto) {
    // Find skill by name (case-insensitive) in master list
    let skill = await this.db.query.skills.findFirst({
      where: ilike(skills.name, dto.skillName),
    });

    // If skill not found in master list, create it as a user-typed skill
    if (!skill) {
      const [newSkill] = await this.db
        .insert(skills)
        .values({
          name: dto.skillName.trim(),
          category: dto.category || 'industry_specific',
          isActive: true,
          type: 'user-typed',
        })
        .returning();
      skill = newSkill;
    }

    // Check if already added
    const existing = await this.db.query.profileSkills.findFirst({
      where: and(eq(profileSkills.profileId, profileId), eq(profileSkills.skillId, skill.id)),
    });

    if (existing) {
      // If it exists, we might want to return the existing one or throw conflict
      // For bulk add, sticking to throw for consistency, but caller can catch
      throw new ConflictException(`Skill '${dto.skillName}' already added to profile`);
    }

    const [profileSkill] = await this.db
      .insert(profileSkills)
      .values({
        profileId,
        skillId: skill.id,
        proficiencyLevel: dto.proficiencyLevel || ProficiencyLevel.BEGINNER,
        yearsOfExperience: dto.yearsOfExperience?.toString(),
        displayOrder: dto.displayOrder || 0,
      })
      .returning();

    return { ...profileSkill, skill };
  }

  // Profile skills
  async addSkill(userId: string, dto: AddProfileSkillDto) {
    const profileId = await this.getProfileId(userId);

    const result = await this.addSkillToProfile(profileId, dto);

    await updateOnboardingStep(this.db, userId, 4);

    return result;
  }

  async addSkillsBulk(userId: string, dto: BulkAddProfileSkillDto) {
    const profileId = await this.getProfileId(userId);
    const results = [];
    const errors = [];

    for (const skillDto of dto.skills) {
      try {
        const result = await this.addSkillToProfile(profileId, skillDto);
        results.push(result);
      } catch (error) {
        if (error instanceof ConflictException) {
          // If already exists, we can consider it "success" or just skip
          // For now, let's just log/ignore duplicates in bulk op
          continue;
        }
        errors.push({ skill: skillDto.skillName, error: error.message });
      }
    }

    await updateOnboardingStep(this.db, userId, 4);

    return { added: results, errors };
  }

  async getProfileSkills(userId: string) {
    const profileId = await this.getProfileId(userId);

    const result = await this.db.query.profileSkills.findMany({
      where: eq(profileSkills.profileId, profileId),
      orderBy: (ps, { asc }) => [asc(ps.displayOrder)],
      with: {
        skill: true,
      },
    });

    return result;
  }

  async updateProfileSkill(userId: string, skillId: string, dto: UpdateProfileSkillDto) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.profileSkills.findFirst({
      where: and(eq(profileSkills.profileId, profileId), eq(profileSkills.skillId, skillId)),
    });

    if (!existing) throw new NotFoundException('Skill not found in profile');

    const updateData: Record<string, any> = {};
    if (dto.proficiencyLevel) updateData.proficiencyLevel = dto.proficiencyLevel;
    if (dto.yearsOfExperience !== undefined)
      updateData.yearsOfExperience = dto.yearsOfExperience.toString();
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;

    await this.db.update(profileSkills).set(updateData).where(eq(profileSkills.id, existing.id));

    const result = await this.db.query.profileSkills.findFirst({
      where: eq(profileSkills.id, existing.id),
      with: {
        skill: true,
      },
    });

    await updateOnboardingStep(this.db, userId, 4);

    return result;
  }

  async removeSkill(userId: string, skillId: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.profileSkills.findFirst({
      where: and(eq(profileSkills.profileId, profileId), eq(profileSkills.skillId, skillId)),
    });

    if (!existing) throw new NotFoundException('Skill not found in profile');

    await this.db.delete(profileSkills).where(eq(profileSkills.id, existing.id));

    await recalculateOnboardingCompletion(this.db, userId);

    return { success: true };
  }
}
