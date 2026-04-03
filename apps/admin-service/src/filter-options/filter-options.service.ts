import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, asc, isNull, isNotNull, count, desc, sql } from 'drizzle-orm';
import { Database, filterOptions, jobCategories, jobs } from '@ai-job-portal/database';
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
  { group: 'posted_within', label: 'Last 7 days', value: '7d', displayOrder: 2 },
  { group: 'posted_within', label: 'Last 30 days', value: '30d', displayOrder: 3 },
  { group: 'posted_within', label: 'Anytime', value: 'all', displayOrder: 4 },

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
  { group: 'sort_by', label: 'Salary Low to High', value: 'salary_asc', displayOrder: 1 },
  { group: 'sort_by', label: 'Salary High to Low', value: 'salary_desc', displayOrder: 2 },
];

// Groups that are sourced from job_categories instead of filter_options
const CATEGORY_GROUPS = ['industry', 'department'];

@Injectable()
export class FilterOptionsService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async getAll(group?: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    // industry → parent categories (parentId IS NULL)
    // department → subcategories (parentId IS NOT NULL)
    if (group === 'industry' || group === 'department') {
      const isParent = group === 'industry';
      const condition = isParent
        ? isNull(jobCategories.parentId)
        : isNotNull(jobCategories.parentId);

      const [rows, [{ total }]] = await Promise.all([
        this.db
          .select()
          .from(jobCategories)
          .where(condition)
          .orderBy(sql`${jobCategories.displayOrder} ASC NULLS LAST`, asc(jobCategories.name))
          .limit(limit)
          .offset(offset),
        this.db.select({ total: count() }).from(jobCategories).where(condition),
      ]);

      const data = rows.map((c) => ({
        id: c.id,
        group,
        label: c.name,
        value: c.name,
        isActive: c.isActive,
        displayOrder: c.displayOrder,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));

      const totalCount = Number(total);
      const pageCount = Math.ceil(totalCount / limit);
      return {
        data,
        pagination: {
          total: totalCount,
          pageCount,
          currentPage: page,
          hasNextPage: page < pageCount,
        },
      };
    }

    // All other groups — read from filter_options table
    const whereClause = group ? eq(filterOptions.group, group) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      whereClause
        ? this.db
            .select()
            .from(filterOptions)
            .where(whereClause)
            .orderBy(asc(filterOptions.displayOrder))
            .limit(limit)
            .offset(offset)
        : this.db
            .select()
            .from(filterOptions)
            .orderBy(asc(filterOptions.group), asc(filterOptions.displayOrder))
            .limit(limit)
            .offset(offset),
      whereClause
        ? this.db.select({ total: count() }).from(filterOptions).where(whereClause)
        : this.db.select({ total: count() }).from(filterOptions),
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
    if (CATEGORY_GROUPS.includes(dto.group)) {
      throw new ConflictException(
        `Group "${dto.group}" is managed via job categories. Use the category management endpoints instead.`,
      );
    }

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
    // Check if this ID belongs to job_categories (industry/department)
    const category = await this.db
      .select()
      .from(jobCategories)
      .where(eq(jobCategories.id, id))
      .limit(1);

    if (category.length > 0) {
      // Update job_categories — only isActive and displayOrder are editable here
      const [updated] = await this.db
        .update(jobCategories)
        .set({
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.displayOrder !== undefined && { displayOrder: dto.displayOrder }),
          updatedAt: new Date(),
        })
        .where(eq(jobCategories.id, id))
        .returning();

      const isParent = updated.parentId === null;
      return {
        id: updated.id,
        group: isParent ? 'industry' : 'department',
        label: updated.name,
        value: updated.name,
        isActive: updated.isActive,
        displayOrder: updated.displayOrder,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    }

    // Otherwise update filter_options table
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
    // Check if this ID belongs to job_categories
    const category = await this.db
      .select()
      .from(jobCategories)
      .where(eq(jobCategories.id, id))
      .limit(1);

    if (category.length > 0) {
      throw new ConflictException(
        `Category "${category[0].name}" cannot be deleted from here. Use the category management endpoints.`,
      );
    }

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
    let inserted = 0;
    let skipped = 0;

    for (const option of DEFAULT_FILTER_OPTIONS) {
      const existing = await this.db
        .select()
        .from(filterOptions)
        .where(and(eq(filterOptions.group, option.group), eq(filterOptions.value, option.value)))
        .limit(1);

      if (existing.length === 0) {
        await this.db.insert(filterOptions).values(option);
        inserted++;
      } else {
        skipped++;
      }
    }

    return {
      message: 'Filter options seeded successfully',
      inserted,
      skipped,
      total: DEFAULT_FILTER_OPTIONS.length,
    };
  }

  /**
   * Sets all job_categories to inactive, then activates the top N
   * parent categories (industry) and top N subcategories (department) by job count.
   * Safe to re-run anytime to refresh the active set.
   */
  async syncTopCategories(topN = 5) {
    // Deactivate all categories
    await this.db.update(jobCategories).set({ isActive: false, updatedAt: new Date() });

    // Top N parent categories by job count
    const topParents = await this.db
      .select({ id: jobCategories.id })
      .from(jobCategories)
      .leftJoin(jobs, eq(jobs.categoryId, jobCategories.id))
      .where(isNull(jobCategories.parentId))
      .groupBy(jobCategories.id)
      .orderBy(desc(count(jobs.id)))
      .limit(topN);

    if (topParents.length) {
      await this.db
        .update(jobCategories)
        .set({ isActive: true, updatedAt: new Date() })
        .where(
          sql`${jobCategories.id} IN (${sql.join(
            topParents.map((r) => sql`${r.id}`),
            sql`, `,
          )})`,
        );
    }

    // Top N subcategories by job count
    const topSubs = await this.db
      .select({ id: jobCategories.id })
      .from(jobCategories)
      .leftJoin(jobs, eq(jobs.subCategoryId, jobCategories.id))
      .where(isNotNull(jobCategories.parentId))
      .groupBy(jobCategories.id)
      .orderBy(desc(count(jobs.id)))
      .limit(topN);

    if (topSubs.length) {
      await this.db
        .update(jobCategories)
        .set({ isActive: true, updatedAt: new Date() })
        .where(
          sql`${jobCategories.id} IN (${sql.join(
            topSubs.map((r) => sql`${r.id}`),
            sql`, `,
          )})`,
        );
    }

    return {
      message: `Top ${topN} categories and subcategories activated. All others set to inactive.`,
      activatedIndustry: topParents.length,
      activatedDepartment: topSubs.length,
    };
  }
}
