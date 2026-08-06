import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import {
  eq,
  and,
  desc,
  sql,
  gte,
  lt,
  isNull,
  or,
  ilike,
  inArray,
  InferSelectModel,
} from 'drizzle-orm';
import { Database, jobs, employers, jobCategories } from '@ai-job-portal/database';
import { hasCompanyPermission } from '@ai-job-portal/common';
import { DATABASE_CLIENT } from '../database/database.module';

type EmployerJob = InferSelectModel<typeof jobs> & {
  company: { id: string; name: string; logoUrl: string | null } | null;
  category: InferSelectModel<typeof jobCategories> | null;
  subCategory: InferSelectModel<typeof jobCategories> | null;
};

@Injectable()
export class EmployerJobService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async getEmployerJobs(
    userId: string,
    userRole: string,
    opts: {
      active?: boolean;
      search?: string;
      scope?: string;
      status?: string;
      categoryId?: string;
      createdBy?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    data: EmployerJob[];
    pagination: {
      totalJobs: number;
      pageCount: number;
      currentPage: number;
      hasNextPage: boolean;
    };
  }> {
    const { active, search, status, categoryId, createdBy } = opts;
    const page = Math.max(1, opts.page || 1);
    const limit = Math.max(1, opts.limit || 10);

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');

    let conditions: any[];
    let isCompanyScope = false;

    // Auto-detect company-level visibility: if employer has company-jobs:read permission, expand to company
    if (employer.companyId) {
      const hasPermission = await hasCompanyPermission(
        this.db,
        employer.rbacRoleId,
        userRole,
        'company-jobs:read',
      );

      if (hasPermission) {
        conditions = [eq(jobs.companyId, employer.companyId)];
        isCompanyScope = true;
      } else {
        conditions = [eq(jobs.employerId, employer.id)];
      }
    } else {
      conditions = [eq(jobs.employerId, employer.id)];
    }

    if (active !== undefined) conditions.push(eq(jobs.isActive, active));
    if (status) {
      const now = new Date();
      if (status === 'active') {
        // Live jobs: active status AND deadline not passed
        conditions.push(eq(jobs.status, 'active'));
        conditions.push(or(isNull(jobs.deadline), gte(jobs.deadline, now)));
      } else if (status === 'inactive' || status === 'expired') {
        // Inactive jobs: explicitly inactive OR expired by deadline
        // (lt on a NULL deadline yields NULL in SQL, so NULL deadlines are excluded)
        conditions.push(or(eq(jobs.status, 'inactive'), lt(jobs.deadline, now)));
      } else if (status === 'featured') {
        conditions.push(eq(jobs.isFeatured, true));
      } else {
        conditions.push(eq(jobs.status, status));
      }
    }
    if (categoryId) conditions.push(eq(jobs.categoryId, categoryId));

    // Filter by the employer who created the job (company scope only)
    if (createdBy) conditions.push(eq(jobs.employerId, createdBy));

    // Search matches job title OR creator employer name (first/last)
    if (search) {
      const term = `%${search}%`;
      const matchingEmployers = await this.db.query.employers.findMany({
        where: or(ilike(employers.firstName, term), ilike(employers.lastName, term)),
        columns: { id: true },
      });
      const empIds = matchingEmployers.map((e) => e.id);
      const searchConds: any[] = [ilike(jobs.title, term)];
      if (empIds.length > 0) searchConds.push(inArray(jobs.employerId, empIds));
      conditions.push(or(...searchConds));
    }

    const whereClause = and(...conditions);

    const countRows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(whereClause);
    const totalJobs = Number(countRows[0]?.count || 0);
    const pageCount = Math.max(1, Math.ceil(totalJobs / limit));

    const result = await this.db.query.jobs.findMany({
      where: whereClause,
      orderBy: [desc(jobs.createdAt)],
      limit,
      offset: (page - 1) * limit,
      with: {
        employer: {
          columns: { id: true, firstName: true, lastName: true, userId: true },
        },
        company: { columns: { id: true, name: true, logoUrl: true } },
        category: true,
        subCategory: true,
      },
    });

    const pagination = {
      totalJobs,
      pageCount,
      currentPage: page,
      hasNextPage: page < pageCount,
    };

    // Add createdBy info when viewing company-level jobs
    if (isCompanyScope) {
      return {
        data: result.map((job: any) => ({
          ...job,
          createdBy: job.employer
            ? {
                employerId: job.employer.id,
                firstName: job.employer.firstName,
                lastName: job.employer.lastName,
              }
            : null,
        })),
        pagination,
      };
    }

    return { data: result, pagination };
  }

  /**
   * Distinct employers who have created jobs within the caller's company.
   * Powers the "Created By" filter dropdown on the employer jobs page.
   * Requires company-level visibility (company-jobs:read); otherwise returns [].
   */
  async getCompanyJobCreators(
    userId: string,
    userRole: string,
  ): Promise<{ id: string; firstName: string | null; lastName: string | null }[]> {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });
    if (!employer) throw new ForbiddenException('Employer profile required');
    if (!employer.companyId) return [];

    const hasPermission = await hasCompanyPermission(
      this.db,
      employer.rbacRoleId,
      userRole,
      'company-jobs:read',
    );
    if (!hasPermission) return [];

    const rows = await this.db
      .selectDistinct({
        id: employers.id,
        firstName: employers.firstName,
        lastName: employers.lastName,
      })
      .from(jobs)
      .innerJoin(employers, eq(jobs.employerId, employers.id))
      .where(eq(jobs.companyId, employer.companyId))
      .orderBy(employers.firstName);

    return rows;
  }
}
