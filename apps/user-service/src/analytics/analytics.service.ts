import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { profileViews } from '@ai-job-portal/database';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private databaseService: DatabaseService) { }

  /**
   * Record a profile view
   */
  async recordProfileView(profileId: string, employerId: string, source?: string) {
    const db = this.databaseService.db;

    const [view] = await db
      .insert(profileViews)
      .values({
        profileId,
        employerId,
        source,
      })
      .returning();

    this.logger.log(`Profile view recorded: ${profileId} by ${employerId}`);
    return view;
  }

  /**
   * Get profile analytics
   */
  async getProfileAnalytics(profileId: string) {
    const db = this.databaseService.db;

    // Get total views
    const totalViews = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileViews)
      .where(eq(profileViews.profileId, profileId));

    // Get views in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentViews = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileViews)
      .where(
        and(
          eq(profileViews.profileId, profileId),
          gte(profileViews.viewedAt, sevenDaysAgo),
        ),
      );

    // Get views in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyViews = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileViews)
      .where(
        and(
          eq(profileViews.profileId, profileId),
          gte(profileViews.viewedAt, thirtyDaysAgo),
        ),
      );

    // Get unique viewers
    const uniqueViewers = await db
      .selectDistinct({ employerId: profileViews.employerId })
      .from(profileViews)
      .where(eq(profileViews.profileId, profileId));

    return {
      totalViews: totalViews[0]?.count || 0,
      viewsLast7Days: recentViews[0]?.count || 0,
      viewsLast30Days: monthlyViews[0]?.count || 0,
      uniqueViewers: uniqueViewers.length,
    };
  }

  /**
   * Get profile view history
   */
  async getProfileViewHistory(profileId: string, limit: number = 50) {
    const db = this.databaseService.db;

    const views = await db.query.profileViews.findMany({
      where: eq(profileViews.profileId, profileId),
      orderBy: [desc(profileViews.viewedAt)],
      limit,
    });

    return views;
  }

  /**
   * Get views by date range
   */
  async getViewsByDateRange(profileId: string, startDate: Date, endDate: Date) {
    const db = this.databaseService.db;

    const views = await db
      .select({ count: sql<number>`count(*)`, date: sql<string>`DATE(${profileViews.viewedAt})` })
      .from(profileViews)
      .where(
        and(
          eq(profileViews.profileId, profileId),
          gte(profileViews.viewedAt, startDate),
          sql`${profileViews.viewedAt} <= ${endDate}`,
        ),
      )
      .groupBy(sql`DATE(${profileViews.viewedAt})`)
      .orderBy(sql`DATE(${profileViews.viewedAt})`);

    return views;
  }

  /**
   * Get views by source
   */
  async getViewsBySource(profileId: string) {
    const db = this.databaseService.db;

    const viewsBySource = await db
      .select({ source: profileViews.source, count: sql<number>`count(*)` })
      .from(profileViews)
      .where(eq(profileViews.profileId, profileId))
      .groupBy(profileViews.source);

    return viewsBySource;
  }
}
