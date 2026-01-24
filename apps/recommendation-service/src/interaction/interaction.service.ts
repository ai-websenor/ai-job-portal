import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and, sql } from 'drizzle-orm';
import { Database, userInteractions, jobs } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { TrackInteractionDto, InteractionType } from './dto';

@Injectable()
export class InteractionService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async trackInteraction(userId: string, dto: TrackInteractionDto) {
    await this.db.insert(userInteractions).values({
      userId,
      jobId: dto.jobId,
      interactionType: dto.interactionType as any,
      sessionId: dto.sessionId,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      timestamp: new Date(),
    });

    return { success: true, message: 'Interaction tracked' };
  }

  async bulkTrackInteractions(userId: string, interactions: TrackInteractionDto[]) {
    if (interactions.length === 0) {
      return { success: true, count: 0 };
    }

    const values = interactions.map(dto => ({
      userId,
      jobId: dto.jobId,
      interactionType: dto.interactionType as any,
      sessionId: dto.sessionId,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      timestamp: new Date(),
    }));

    await this.db.insert(userInteractions).values(values);

    return { success: true, count: interactions.length };
  }

  async getUserInteractionHistory(userId: string, limit = 50) {
    const interactions = await this.db.query.userInteractions.findMany({
      where: eq(userInteractions.userId, userId),
      orderBy: [desc(userInteractions.timestamp)],
      limit,
    });

    // Get job details
    const jobIds = [...new Set(interactions.map(i => i.jobId))];
    const jobDetails = jobIds.length > 0
      ? await this.db.query.jobs.findMany({
          where: (jobs, { inArray }) => inArray(jobs.id, jobIds),
          columns: { id: true, title: true, location: true },
        })
      : [];

    const jobMap = new Map(jobDetails.map(j => [j.id, j]));

    return interactions.map(i => ({
      ...i,
      job: jobMap.get(i.jobId) || null,
      metadata: i.metadata ? JSON.parse(i.metadata as string) : null,
    }));
  }

  async getInteractionStats(userId: string) {
    const viewCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(userInteractions)
      .where(and(
        eq(userInteractions.userId, userId),
        eq(userInteractions.interactionType, 'view'),
      ));

    const applyCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(userInteractions)
      .where(and(
        eq(userInteractions.userId, userId),
        eq(userInteractions.interactionType, 'apply'),
      ));

    const saveCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(userInteractions)
      .where(and(
        eq(userInteractions.userId, userId),
        eq(userInteractions.interactionType, 'save'),
      ));

    return {
      totalViews: Number(viewCount[0]?.count || 0),
      totalApplications: Number(applyCount[0]?.count || 0),
      totalSaves: Number(saveCount[0]?.count || 0),
    };
  }
}
