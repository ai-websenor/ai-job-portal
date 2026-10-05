import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql, SQL } from 'drizzle-orm';
import { CustomLogger } from '@ai-job-portal/logger';
import {
  Database,
  masterCertifications,
  masterJobTitles,
  masterQualifications,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import {
  clampSearchLimit,
  escapeLikePattern,
  isCaptureableName,
  normaliseName,
} from './master-data.rules';

/**
 * The three master tables are column-for-column identical, so one private
 * helper serves all of them. Their Drizzle types still differ (the table name
 * is part of the type), hence the cast at each call site below — structurally
 * they are interchangeable.
 */
type MasterTable = typeof masterJobTitles;

const asMasterTable = (table: unknown): MasterTable => table as MasterTable;

@Injectable()
export class MasterDataService {
  private readonly logger = new CustomLogger();

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  // ==========================================================================
  // Employer-facing search (job form dropdowns)
  // ==========================================================================

  searchJobTitles(query?: string, limit?: unknown) {
    return this.search(masterJobTitles, query, limit);
  }

  searchQualifications(query?: string, limit?: unknown) {
    return this.search(asMasterTable(masterQualifications), query, limit);
  }

  searchCertifications(query?: string, limit?: unknown) {
    return this.search(asMasterTable(masterCertifications), query, limit);
  }

  /**
   * Both `master-typed` and `user-typed` rows are returned, active only.
   *
   * Including user-typed is deliberate and matches skills: a value an employer
   * typed last week should be offerable to the next employer immediately,
   * rather than waiting on an admin to promote it. `type` is returned so the
   * form can label the two differently if it wants to.
   *
   * Ordering is done in SQL rather than in JS because the ranking has to be
   * applied before LIMIT — sorting a page that was already cut would push the
   * exact match off the end.
   */
  private async search(table: MasterTable, query: string | undefined, rawLimit: unknown) {
    const limit = clampSearchLimit(rawLimit);
    const term = normaliseName(query);

    const conditions: SQL[] = [eq(table.isActive, true)];
    if (term) {
      conditions.push(sql`${table.name} ILIKE ${`%${escapeLikePattern(term)}%`}`);
    }

    // No term: the first page alphabetically, so the dropdown is useful before
    // the employer has typed anything.
    const orderBy = term
      ? sql`
          CASE
            WHEN lower(btrim(${table.name})) = ${term.toLowerCase()} THEN 0
            WHEN lower(btrim(${table.name})) LIKE ${`${escapeLikePattern(term.toLowerCase())}%`} THEN 1
            ELSE 2
          END,
          lower(btrim(${table.name}))
        `
      : sql`lower(btrim(${table.name}))`;

    return this.db
      .select({ id: table.id, name: table.name, type: table.type })
      .from(table)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit);
  }

  // ==========================================================================
  // Save-time capture
  // ==========================================================================

  /**
   * Record any newly typed title / qualification / certification as a
   * `user-typed` master row, so it joins the dropdown and the admin review
   * queue the moment it is used.
   *
   * This is bookkeeping beside the job, not part of it: the method never
   * throws and never rejects. A failure here is logged and dropped, because
   * losing a master row is a nuisance while losing the employer's job posting
   * is not acceptable.
   */
  async captureFromJob(values: {
    title?: string | null;
    qualification?: string | null;
    certification?: string | null;
  }): Promise<void> {
    await Promise.all([
      this.capture(masterJobTitles, values.title, 'job title'),
      this.capture(asMasterTable(masterQualifications), values.qualification, 'qualification'),
      this.capture(asMasterTable(masterCertifications), values.certification, 'certification'),
    ]);
  }

  /**
   * One insert, guarded by `ON CONFLICT DO NOTHING` against the unique
   * `lower(btrim(name))` index. No read-then-write, so two employers posting
   * the same new title at the same moment cannot collide — the loser is a
   * no-op rather than an error.
   *
   * A name that already exists but was deactivated by an admin stays
   * deactivated. That decision is the admin's, and an employer typing the
   * value again is not a reason to overturn it.
   */
  private async capture(table: MasterTable, raw: unknown, label: string): Promise<void> {
    if (!isCaptureableName(raw)) return;
    const name = normaliseName(raw);

    try {
      await this.db
        .insert(table)
        .values({ name, type: 'user-typed', isActive: true })
        .onConflictDoNothing();
    } catch (err: any) {
      this.logger.warn(`Master ${label} capture skipped for "${name}": ${err?.message ?? err}`);
    }
  }
}
