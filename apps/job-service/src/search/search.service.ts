import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ilike, or, and } from 'drizzle-orm';

@Injectable()
export class SearchService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async search(query: {
    keyword?: string;
    location?: string;
    skills?: string[];
  }) {
    const filters: any[] = [];

    if (query.keyword) {
      filters.push(
        or(
          ilike(schema.jobs.title, `%${query.keyword}%`),
          ilike(schema.jobs.description, `%${query.keyword}%`),
        ),
      );
    }

    if (query.location) {
      filters.push(ilike(schema.jobs.location, `%${query.location}%`));
    }

    // Note: This is a simplified search. For production, Elasticsearch is recommended.
    const jobs = await this.db.query.jobs.findMany({
      where: filters.length > 0 ? and(...filters) : undefined,
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
    });

    const count = jobs.length;

    return {
      message:
        jobs.length > 0
          ? 'Search results retrieved successfully'
          : 'No jobs found matching your search',
      jobs,
      total: count,
    };
  }

  /*
  create(createSearchDto: CreateSearchDto) {
    return 'This action adds a new search';
  }

  findAll() {
    return `This action returns all search`;
  }
  */
}
