import { Injectable, Inject, Logger } from '@nestjs/common';
import { sql, gte, lte, and } from 'drizzle-orm';
import { Database, users, jobs, applications, payments, subscriptions } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { DateRangeDto, ReportPeriodDto } from './dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
  ) {}

  async getDashboardStats() {
    const [userStats, jobStats, applicationStats, revenueStats] = await Promise.all([
      this.getUserStats(),
      this.getJobStats(),
      this.getApplicationStats(),
      this.getRevenueStats(),
    ]);

    return {
      users: userStats,
      jobs: jobStats,
      applications: applicationStats,
      revenue: revenueStats,
    };
  }

  async getUserStats() {
    const [total, byRole, recent] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(users),
      this.db.select({
        role: users.role,
        count: sql<number>`count(*)`,
      }).from(users).groupBy(users.role),
      this.db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
    ]);

    return {
      total: Number(total[0]?.count || 0),
      byRole: byRole.reduce((acc, r) => ({ ...acc, [r.role]: Number(r.count) }), {}),
      newLast30Days: Number(recent[0]?.count || 0),
    };
  }

  async getJobStats() {
    const [total, byStatus, recent] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(jobs),
      this.db.select({
        status: jobs.status,
        count: sql<number>`count(*)`,
      }).from(jobs).groupBy(jobs.status),
      this.db.select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(gte(jobs.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
    ]);

    return {
      total: Number(total[0]?.count || 0),
      byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r.status]: Number(r.count) }), {}),
      newLast30Days: Number(recent[0]?.count || 0),
    };
  }

  async getApplicationStats() {
    const [total, byStatus, recent] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(applications),
      this.db.select({
        status: applications.status,
        count: sql<number>`count(*)`,
      }).from(applications).groupBy(applications.status),
      this.db.select({ count: sql<number>`count(*)` })
        .from(applications)
        .where(gte(applications.appliedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
    ]);

    return {
      total: Number(total[0]?.count || 0),
      byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r.status]: Number(r.count) }), {}),
      newLast30Days: Number(recent[0]?.count || 0),
    };
  }

  async getRevenueStats() {
    const [totalRevenue, recentRevenue] = await Promise.all([
      this.db.select({ sum: sql<number>`sum(amount)` })
        .from(payments)
        .where(sql`status = 'completed'`),
      this.db.select({ sum: sql<number>`sum(amount)` })
        .from(payments)
        .where(and(
          sql`status = 'completed'`,
          gte(payments.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        )),
    ]);

    return {
      totalRevenue: Number(totalRevenue[0]?.sum || 0),
      last30Days: Number(recentRevenue[0]?.sum || 0),
    };
  }

  async getUserGrowthReport(dto: ReportPeriodDto) {
    const groupBy = dto.groupBy || 'day';
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dto.endDate ? new Date(dto.endDate) : new Date();

    const dateFormat = {
      day: 'YYYY-MM-DD',
      week: 'YYYY-WW',
      month: 'YYYY-MM',
      year: 'YYYY',
    }[groupBy];

    const result = await this.db.execute(sql`
      SELECT
        to_char(created_at, ${dateFormat}) as period,
        role,
        count(*) as count
      FROM users
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY period, role
      ORDER BY period
    `);

    return result.rows;
  }

  async getRevenueReport(dto: ReportPeriodDto) {
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dto.endDate ? new Date(dto.endDate) : new Date();

    const result = await this.db.execute(sql`
      SELECT
        to_char(created_at, 'YYYY-MM-DD') as date,
        sum(amount) as revenue,
        count(*) as payments
      FROM payments
      WHERE status = 'completed'
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY date
      ORDER BY date
    `);

    return result.rows;
  }

  async getTopEmployers(limit = 10) {
    const result = await this.db.execute(sql`
      SELECT
        ep.company_name,
        ep.id as employer_id,
        count(j.id) as job_count,
        count(a.id) as application_count
      FROM employer_profiles ep
      LEFT JOIN jobs j ON j.employer_profile_id = ep.id
      LEFT JOIN applications a ON a.job_id = j.id
      GROUP BY ep.id, ep.company_name
      ORDER BY job_count DESC
      LIMIT ${limit}
    `);

    return result.rows;
  }

  async getJobCategoryStats() {
    const result = await this.db.execute(sql`
      SELECT
        c.name as category,
        count(j.id) as job_count,
        count(a.id) as application_count
      FROM job_categories c
      LEFT JOIN jobs j ON j.category_id = c.id
      LEFT JOIN applications a ON a.job_id = j.id
      GROUP BY c.id, c.name
      ORDER BY job_count DESC
    `);

    return result.rows;
  }
}
