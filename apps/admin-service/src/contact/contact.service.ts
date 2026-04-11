import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq, desc, count } from 'drizzle-orm';
import { Database, contactSubmissions } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateContactSubmissionDto, UpdateContactSubmissionDto, ContactQueryDto } from './dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async create(dto: CreateContactSubmissionDto) {
    const [submission] = await this.db
      .insert(contactSubmissions)
      .values({
        name: dto.name,
        email: dto.email,
        message: dto.message,
      } as any)
      .returning();

    return submission;
  }

  async findAll(query: ContactQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    const whereClause = query.status
      ? eq(contactSubmissions.status, query.status as any)
      : undefined;

    const [submissions, totalResult] = await Promise.all([
      (this.db.query as any).contactSubmissions.findMany({
        where: whereClause,
        orderBy: [desc(contactSubmissions.createdAt)],
        limit,
        offset,
      }),
      this.db.select({ total: count() }).from(contactSubmissions).where(whereClause),
    ]);

    const total = totalResult[0]?.total || 0;

    return {
      message: 'Contact submissions fetched successfully',
      data: submissions,
      pagination: {
        totalSubmission: total,
        pageCount: Math.ceil(total / limit),
        currentPage: page,
        hasNextPage: page * limit < total,
      },
    };
  }

  async findOne(id: string) {
    const submission = await (this.db.query as any).contactSubmissions.findFirst({
      where: eq(contactSubmissions.id, id),
    });

    if (!submission) {
      throw new NotFoundException('Contact submission not found');
    }

    return submission;
  }

  async update(id: string, dto: UpdateContactSubmissionDto) {
    const [updated] = await this.db
      .update(contactSubmissions)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(eq(contactSubmissions.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Contact submission not found');
    }

    return updated;
  }

  async delete(id: string) {
    await this.db.delete(contactSubmissions).where(eq(contactSubmissions.id, id));
    return { success: true };
  }
}
