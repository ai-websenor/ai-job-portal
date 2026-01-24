import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { Database, jobs, screeningQuestions, employers } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateScreeningQuestionDto, UpdateScreeningQuestionDto, ReorderQuestionsDto } from './dto';

@Injectable()
export class ScreeningQuestionService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async verifyJobOwnership(userId: string, jobId: string) {
    const job = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
      with: { employer: true },
    });

    if (!job) throw new NotFoundException('Job not found');

    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.id, job.employerId),
    });

    if (!employer || employer.userId !== userId) {
      throw new ForbiddenException('Not authorized to modify this job');
    }

    return job;
  }

  async create(userId: string, jobId: string, dto: CreateScreeningQuestionDto) {
    await this.verifyJobOwnership(userId, jobId);

    // Get current max order
    const existing = await this.db.query.screeningQuestions.findMany({
      where: eq(screeningQuestions.jobId, jobId),
      orderBy: (q, { desc }) => [desc(q.order)],
      limit: 1,
    });

    const maxOrder = existing[0]?.order || 0;

    const [question] = await this.db.insert(screeningQuestions).values({
      jobId,
      question: dto.question,
      questionType: dto.questionType,
      options: dto.options,
      isRequired: dto.isRequired ?? true,
      order: dto.order ?? maxOrder + 1,
    }).returning();

    return question;
  }

  async findAll(jobId: string) {
    return this.db.query.screeningQuestions.findMany({
      where: eq(screeningQuestions.jobId, jobId),
      orderBy: (q, { asc }) => [asc(q.order)],
    });
  }

  async findOne(jobId: string, id: string) {
    const question = await this.db.query.screeningQuestions.findFirst({
      where: and(eq(screeningQuestions.id, id), eq(screeningQuestions.jobId, jobId)),
    });

    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async update(userId: string, jobId: string, id: string, dto: UpdateScreeningQuestionDto) {
    await this.verifyJobOwnership(userId, jobId);

    const existing = await this.db.query.screeningQuestions.findFirst({
      where: and(eq(screeningQuestions.id, id), eq(screeningQuestions.jobId, jobId)),
    });

    if (!existing) throw new NotFoundException('Question not found');

    await this.db.update(screeningQuestions)
      .set(dto)
      .where(eq(screeningQuestions.id, id));

    return this.findOne(jobId, id);
  }

  async remove(userId: string, jobId: string, id: string) {
    await this.verifyJobOwnership(userId, jobId);

    const existing = await this.db.query.screeningQuestions.findFirst({
      where: and(eq(screeningQuestions.id, id), eq(screeningQuestions.jobId, jobId)),
    });

    if (!existing) throw new NotFoundException('Question not found');

    await this.db.delete(screeningQuestions).where(eq(screeningQuestions.id, id));

    return { success: true };
  }

  async reorder(userId: string, jobId: string, dto: ReorderQuestionsDto) {
    await this.verifyJobOwnership(userId, jobId);

    // Update order for each question
    await Promise.all(dto.questionIds.map((id, index) =>
      this.db.update(screeningQuestions)
        .set({ order: index })
        .where(and(eq(screeningQuestions.id, id), eq(screeningQuestions.jobId, jobId)))
    ));

    return this.findAll(jobId);
  }
}
