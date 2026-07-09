import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, interviews } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class InterviewLookupHelper {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async getById(id: string) {
    const interview = await this.db.query.interviews.findFirst({
      where: eq(interviews.id, id),
      with: {
        application: {
          with: {
            job: { with: { employer: { with: { company: true } } } },
            jobSeeker: { with: { profile: true } },
          },
        },
        feedback: true,
      },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }
}
