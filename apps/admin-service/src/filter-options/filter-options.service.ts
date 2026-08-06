import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, or, ilike, asc, count, sql, SQL } from 'drizzle-orm';
import { Database, filterOptions } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateFilterOptionDto, UpdateFilterOptionDto } from './dto';

const DEFAULT_FILTER_OPTIONS: {
  group: string;
  label: string;
  value: string;
  displayOrder: number;
}[] = [
  // Experience Levels
  { group: 'experience_level', label: 'Fresher', value: 'fresher', displayOrder: 1 },
  { group: 'experience_level', label: '1', value: '1', displayOrder: 2 },
  { group: 'experience_level', label: '2', value: '2', displayOrder: 3 },
  { group: 'experience_level', label: '3', value: '3', displayOrder: 4 },
  { group: 'experience_level', label: '4', value: '4', displayOrder: 5 },
  { group: 'experience_level', label: '5+', value: '5+', displayOrder: 6 },

  // Location Types
  { group: 'location_type', label: 'Remote', value: 'remote', displayOrder: 1 },
  { group: 'location_type', label: 'Onsite', value: 'onsite', displayOrder: 2 },
  { group: 'location_type', label: 'Hybrid', value: 'hybrid', displayOrder: 3 },

  // Pay Rate Periods
  { group: 'pay_rate', label: 'Hourly', value: 'hourly', displayOrder: 1 },
  { group: 'pay_rate', label: 'Daily', value: 'daily', displayOrder: 2 },
  { group: 'pay_rate', label: 'Weekly', value: 'weekly', displayOrder: 3 },
  { group: 'pay_rate', label: 'Monthly', value: 'monthly', displayOrder: 4 },
  { group: 'pay_rate', label: 'Yearly', value: 'yearly', displayOrder: 5 },

  // Posted Within
  { group: 'posted_within', label: 'Last 24 hours', value: '24h', displayOrder: 1 },
  { group: 'posted_within', label: 'Last 3 days', value: '3d', displayOrder: 2 },
  { group: 'posted_within', label: 'Last 7 days', value: '7d', displayOrder: 3 },
  { group: 'posted_within', label: 'Last 30 days', value: '30d', displayOrder: 4 },
  { group: 'posted_within', label: 'Anytime', value: 'all', displayOrder: 5 },

  // Job Types
  { group: 'job_type', label: 'Full Time', value: 'full_time', displayOrder: 1 },
  { group: 'job_type', label: 'Part Time', value: 'part_time', displayOrder: 2 },
  { group: 'job_type', label: 'Contract', value: 'contract', displayOrder: 3 },
  { group: 'job_type', label: 'Gig', value: 'gig', displayOrder: 4 },
  { group: 'job_type', label: 'Remote', value: 'remote', displayOrder: 5 },

  // Company Types
  { group: 'company_type', label: 'Startup', value: 'startup', displayOrder: 1 },
  { group: 'company_type', label: 'SME', value: 'sme', displayOrder: 2 },
  { group: 'company_type', label: 'MNC', value: 'mnc', displayOrder: 3 },
  { group: 'company_type', label: 'Government', value: 'government', displayOrder: 4 },

  // Sort Options
  { group: 'sort_by', label: 'Most Relevant', value: 'relevance', displayOrder: 1 },
  { group: 'sort_by', label: 'Newest', value: 'date', displayOrder: 2 },
  { group: 'sort_by', label: 'Salary Low to High', value: 'salary_asc', displayOrder: 3 },
  { group: 'sort_by', label: 'Salary High to Low', value: 'salary_desc', displayOrder: 4 },
];

@Injectable()
export class FilterOptionsService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async getAll(group?: string, page = 1, limit = 20, search?: string) {
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (group) {
      conditions.push(eq(filterOptions.group, group));
    }
    const term = search?.trim();
    if (term) {
      conditions.push(
        or(ilike(filterOptions.label, `%${term}%`), ilike(filterOptions.value, `%${term}%`)) as SQL,
      );
    }
    const whereClause = conditions.length ? and(...conditions) : undefined;

    // When no group is given, sort across groups; otherwise sort within the group.
    const orderBy = group
      ? [asc(filterOptions.displayOrder)]
      : [asc(filterOptions.group), asc(filterOptions.displayOrder)];

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(filterOptions)
        .where(whereClause)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(filterOptions).where(whereClause),
    ]);

    const totalCount = Number(total);
    const pageCount = Math.ceil(totalCount / limit);
    return {
      data: rows,
      pagination: {
        total: totalCount,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
  }

  async create(dto: CreateFilterOptionDto) {
    const existing = await this.db
      .select()
      .from(filterOptions)
      .where(and(eq(filterOptions.group, dto.group), eq(filterOptions.value, dto.value)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(
        `Filter option with group "${dto.group}" and value "${dto.value}" already exists`,
      );
    }

    const [created] = await this.db
      .insert(filterOptions)
      .values({
        group: dto.group,
        label: dto.label,
        value: dto.value,
        isActive: dto.isActive ?? true,
        displayOrder: dto.displayOrder ?? 0,
      })
      .returning();

    return created;
  }

  async update(id: string, dto: UpdateFilterOptionDto) {
    const existing = await this.db
      .select()
      .from(filterOptions)
      .where(eq(filterOptions.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(`Filter option with ID "${id}" not found`);
    }

    if (dto.value && dto.value !== existing[0].value) {
      const duplicate = await this.db
        .select()
        .from(filterOptions)
        .where(and(eq(filterOptions.group, existing[0].group), eq(filterOptions.value, dto.value)))
        .limit(1);

      if (duplicate.length > 0) {
        throw new ConflictException(
          `Filter option with group "${existing[0].group}" and value "${dto.value}" already exists`,
        );
      }
    }

    const [updated] = await this.db
      .update(filterOptions)
      .set({
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
        updatedAt: new Date(),
      })
      .where(eq(filterOptions.id, id))
      .returning();

    return updated;
  }

  async delete(id: string) {
    const existing = await this.db
      .select()
      .from(filterOptions)
      .where(eq(filterOptions.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(`Filter option with ID "${id}" not found`);
    }

    await this.db.delete(filterOptions).where(eq(filterOptions.id, id));

    return { message: 'Filter option deleted successfully' };
  }

  async seed() {
    // (group, value) has a unique index — one bulk upsert. Existing rows get
    // their default label/displayOrder refreshed (so re-seeding after a
    // defaults change reorders correctly) while admin-managed isActive is
    // preserved. xmax = 0 distinguishes inserted rows from updated ones.
    const rows = await this.db
      .insert(filterOptions)
      .values(DEFAULT_FILTER_OPTIONS)
      .onConflictDoUpdate({
        target: [filterOptions.group, filterOptions.value],
        set: {
          label: sql`excluded.label`,
          displayOrder: sql`excluded.display_order`,
          updatedAt: new Date(),
        },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` });

    const inserted = rows.filter((r) => r.inserted).length;
    const updated = rows.length - inserted;

    return {
      message: 'Filter options seeded successfully',
      inserted,
      updated,
      total: DEFAULT_FILTER_OPTIONS.length,
    };
  }
}
