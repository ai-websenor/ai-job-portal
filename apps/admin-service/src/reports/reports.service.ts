import { Injectable, Inject, Logger } from '@nestjs/common';
import { sql, gte, and } from 'drizzle-orm';
import { Database, users, jobs, jobApplications, payments } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { DateRangeDto, ReportPeriodDto } from './dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  // ── helpers ──────────────────────────────────────────────

  private resolveDates(dto: DateRangeDto, defaultDays = 30) {
    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000);
    const endDate = dto.endDate ? new Date(dto.endDate) : new Date();
    return { startDate, endDate };
  }

  private resolveDateFormat(groupBy: string) {
    return (
      {
        day: 'YYYY-MM-DD',
        week: 'IYYY-IW',
        month: 'YYYY-MM',
        year: 'YYYY',
      }[groupBy] || 'YYYY-MM-DD'
    );
  }

  // ── existing endpoints ───────────────────────────────────

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
      this.db
        .select({ role: users.role, count: sql<number>`count(*)` })
        .from(users)
        .groupBy(users.role),
      this.db
        .select({ count: sql<number>`count(*)` })
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
    const [total, activeCount, inactiveCount, recent] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(jobs),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(sql`is_active = true`),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(sql`is_active = false`),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(gte(jobs.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
    ]);

    return {
      total: Number(total[0]?.count || 0),
      byStatus: {
        active: Number(activeCount[0]?.count || 0),
        inactive: Number(inactiveCount[0]?.count || 0),
      },
      newLast30Days: Number(recent[0]?.count || 0),
    };
  }

  async getApplicationStats() {
    const [total, byStatus, recent] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(jobApplications),
      this.db
        .select({ status: jobApplications.status, count: sql<number>`count(*)` })
        .from(jobApplications)
        .groupBy(jobApplications.status),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(jobApplications)
        .where(gte(jobApplications.appliedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
    ]);

    return {
      total: Number(total[0]?.count || 0),
      byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r.status]: Number(r.count) }), {}),
      newLast30Days: Number(recent[0]?.count || 0),
    };
  }

  async getRevenueStats() {
    const [totalRevenue, recentRevenue] = await Promise.all([
      this.db
        .select({ sum: sql<number>`sum(amount)` })
        .from(payments)
        .where(sql`status = 'success'`),
      this.db
        .select({ sum: sql<number>`sum(amount)` })
        .from(payments)
        .where(
          and(
            sql`status = 'success'`,
            gte(payments.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
          ),
        ),
    ]);

    return {
      totalRevenue: Number(totalRevenue[0]?.sum || 0),
      last30Days: Number(recentRevenue[0]?.sum || 0),
    };
  }

  async getUserGrowthReport(dto: ReportPeriodDto) {
    const groupBy = dto.groupBy || 'day';
    const { startDate, endDate } = this.resolveDates(dto);
    const dateFormat = this.resolveDateFormat(groupBy);

    const result = await this.db.execute(sql`
      SELECT to_char(created_at, ${dateFormat}) as period, role, count(*) as count
      FROM users
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY period, role
      ORDER BY period
    `);

    return result.rows;
  }

  async getRevenueReport(dto: ReportPeriodDto) {
    const { startDate, endDate } = this.resolveDates(dto);
    const groupBy = dto.groupBy || 'day';
    const dateFormat = this.resolveDateFormat(groupBy);

    const result = await this.db.execute(sql`
      SELECT
        to_char(created_at, ${dateFormat}) as period,
        sum(amount) as revenue,
        count(*) as payments
      FROM payments
      WHERE status = 'success'
        AND created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY period
      ORDER BY period
    `);

    return result.rows;
  }

  async getTopEmployers(limit = 10) {
    const result = await this.db.execute(sql`
      SELECT
        c.name as company_name,
        e.id as employer_id,
        count(DISTINCT j.id) as job_count,
        count(DISTINCT a.id) as application_count
      FROM employers e
      LEFT JOIN companies c ON c.id = e.company_id
      LEFT JOIN jobs j ON j.employer_id = e.id
      LEFT JOIN job_applications a ON a.job_id = j.id
      GROUP BY e.id, c.name
      ORDER BY job_count DESC
      LIMIT ${limit}
    `);

    return result.rows;
  }

  async getJobCategoryStats() {
    const result = await this.db.execute(sql`
      SELECT
        c.name as category,
        count(DISTINCT j.id) as job_count,
        count(DISTINCT a.id) as application_count
      FROM job_categories c
      LEFT JOIN jobs j ON j.category_id = c.id
      LEFT JOIN job_applications a ON a.job_id = j.id
      GROUP BY c.id, c.name
      ORDER BY job_count DESC
    `);

    return result.rows;
  }

  // ── new endpoints ────────────────────────────────────────

  async getInterviewStats(dto: DateRangeDto) {
    const { startDate, endDate } = this.resolveDates(dto, 90);

    const result = await this.db.execute(sql`
      SELECT
        status,
        interview_type,
        interview_mode,
        count(*) as count
      FROM interviews
      WHERE scheduled_at >= ${startDate} AND scheduled_at <= ${endDate}
      GROUP BY status, interview_type, interview_mode
    `);

    const rows = result.rows as any[];

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byMode: Record<string, number> = {};
    let total = 0;

    for (const row of rows) {
      const c = Number(row.count);
      total += c;
      byStatus[row.status] = (byStatus[row.status] || 0) + c;
      byType[row.interview_type] = (byType[row.interview_type] || 0) + c;
      byMode[row.interview_mode] = (byMode[row.interview_mode] || 0) + c;
    }

    return { total, byStatus, byType, byMode };
  }

  async getApplicationsOverTime(dto: ReportPeriodDto) {
    const groupBy = dto.groupBy || 'day';
    const { startDate, endDate } = this.resolveDates(dto);
    const dateFormat = this.resolveDateFormat(groupBy);

    const result = await this.db.execute(sql`
      SELECT
        to_char(applied_at, ${dateFormat}) as period,
        status,
        count(*) as count
      FROM job_applications
      WHERE applied_at >= ${startDate} AND applied_at <= ${endDate}
      GROUP BY period, status
      ORDER BY period
    `);

    return result.rows;
  }

  async getJobsOverTime(dto: ReportPeriodDto) {
    const groupBy = dto.groupBy || 'day';
    const { startDate, endDate } = this.resolveDates(dto);
    const dateFormat = this.resolveDateFormat(groupBy);

    const result = await this.db.execute(sql`
      SELECT
        to_char(created_at, ${dateFormat}) as period,
        count(*) as count,
        count(*) FILTER (WHERE is_active = true) as active_count,
        count(*) FILTER (WHERE is_active = false) as inactive_count
      FROM jobs
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY period
      ORDER BY period
    `);

    return result.rows;
  }

  async getCandidateAnalytics() {
    const [byExperience, byLocation, byGender, profileCompletion] = await Promise.all([
      this.db.execute(sql`
        SELECT
          CASE
            WHEN total_experience_years IS NULL THEN 'Not specified'
            WHEN total_experience_years < 1 THEN '0-1 years'
            WHEN total_experience_years < 3 THEN '1-3 years'
            WHEN total_experience_years < 5 THEN '3-5 years'
            WHEN total_experience_years < 10 THEN '5-10 years'
            ELSE '10+ years'
          END as bracket,
          count(*) as count
        FROM profiles
        GROUP BY bracket
        ORDER BY count DESC
      `),
      this.db.execute(sql`
        SELECT COALESCE(state, 'Not specified') as location, count(*) as count
        FROM profiles
        GROUP BY state
        ORDER BY count DESC
        LIMIT 15
      `),
      this.db.execute(sql`
        SELECT COALESCE(gender, 'not_specified') as gender, count(*) as count
        FROM profiles
        GROUP BY gender
        ORDER BY count DESC
      `),
      this.db.execute(sql`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE is_profile_complete = true) as complete,
          round(avg(completion_percentage)) as avg_completion
        FROM profiles
      `),
    ]);

    return {
      byExperience: byExperience.rows,
      byLocation: byLocation.rows,
      byGender: byGender.rows,
      profileCompletion: profileCompletion.rows[0] || { total: 0, complete: 0, avg_completion: 0 },
    };
  }

  async getEmployerAnalytics(dto: ReportPeriodDto) {
    const groupBy = dto.groupBy || 'month';
    const { startDate, endDate } = this.resolveDates(dto, 365);
    const dateFormat = this.resolveDateFormat(groupBy);

    const [overTime, byType, byPlan, totals] = await Promise.all([
      this.db.execute(sql`
        SELECT to_char(e.created_at, ${dateFormat}) as period, count(*) as count
        FROM employers e
        WHERE e.created_at >= ${startDate} AND e.created_at <= ${endDate}
        GROUP BY period
        ORDER BY period
      `),
      this.db.execute(sql`
        SELECT COALESCE(c.company_type::text, 'Not Specified') as type, count(*) as count
        FROM employers e
        LEFT JOIN companies c ON c.id = e.company_id
        GROUP BY c.company_type
        ORDER BY count DESC
      `),
      this.db.execute(sql`
        SELECT subscription_plan as plan, count(*) as count
        FROM employers
        GROUP BY subscription_plan
        ORDER BY count DESC
      `),
      this.db.execute(sql`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE is_verified = true) as verified
        FROM employers
      `),
    ]);

    return {
      overTime: overTime.rows,
      byType: byType.rows,
      byPlan: byPlan.rows,
      totals: totals.rows[0] || { total: 0, verified: 0 },
    };
  }

  async getHiringFunnel(dto: DateRangeDto) {
    const { startDate, endDate } = this.resolveDates(dto, 90);

    const result = await this.db.execute(sql`
      SELECT status, count(*) as count
      FROM job_applications
      WHERE applied_at >= ${startDate} AND applied_at <= ${endDate}
      GROUP BY status
    `);

    const statusMap: Record<string, number> = {};
    for (const row of result.rows as any[]) {
      statusMap[row.status] = Number(row.count);
    }

    const applied = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const viewed = statusMap['viewed'] || 0;
    const shortlisted = statusMap['shortlisted'] || 0;
    const interviewScheduled = statusMap['interview_scheduled'] || 0;
    const offerAccepted = statusMap['offer_accepted'] || 0;
    const hired = statusMap['hired'] || 0;
    const rejected = statusMap['rejected'] || 0;
    const offerRejected = statusMap['offer_rejected'] || 0;
    const withdrawn = statusMap['withdrawn'] || 0;

    return {
      applied,
      viewed,
      shortlisted,
      interviewScheduled,
      offerAccepted,
      hired,
      rejected,
      offerRejected,
      withdrawn,
    };
  }

  async getRevenueByEmployer(dto: DateRangeDto, limit = 10) {
    const { startDate, endDate } = this.resolveDates(dto, 365);

    const result = await this.db.execute(sql`
      SELECT
        c.name as company_name,
        sum(p.amount) as total_revenue,
        count(p.id) as payment_count
      FROM payments p
      JOIN users u ON u.id = p.user_id
      JOIN employers e ON e.user_id = u.id
      LEFT JOIN companies c ON c.id = e.company_id
      WHERE p.status = 'success'
        AND p.created_at >= ${startDate} AND p.created_at <= ${endDate}
      GROUP BY c.name
      ORDER BY total_revenue DESC
      LIMIT ${limit}
    `);

    return result.rows;
  }
}
