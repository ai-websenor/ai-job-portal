import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, ne, sql, SQL } from 'drizzle-orm';
import {
  Database,
  masterCertifications,
  masterJobTitles,
  masterQualifications,
} from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { ListMasterDataDto, UpdateMasterDataDto } from './dto';

export type MasterDataResource = 'job-titles' | 'qualifications' | 'certifications';

/**
 * The three tables are column-for-column identical, so one set of methods
 * serves all of them. Their Drizzle types still differ (the table name is part
 * of the type), hence the cast — structurally they are interchangeable.
 */
type MasterTable = typeof masterJobTitles;

const TABLES: Record<MasterDataResource, MasterTable> = {
  'job-titles': masterJobTitles,
  qualifications: masterQualifications as unknown as MasterTable,
  certifications: masterCertifications as unknown as MasterTable,
};

const LABELS: Record<MasterDataResource, string> = {
  'job-titles': 'Job title',
  qualifications: 'Qualification',
  certifications: 'Certification',
};

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 100;

/** Postgres unique-violation. Raised by the unique lower(btrim(name)) index. */
const UNIQUE_VIOLATION = '23505';

/**
 * Escape the LIKE/ILIKE wildcards so searching for `100%` or `C_C` matches
 * those literal names. Backslash is Postgres' default LIKE escape character,
 * so no ESCAPE clause is needed. (job-service keeps its own copy of this for
 * the employer-facing search — the two services share no code package.)
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

@Injectable()
export class MasterDataService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  /**
   * Paginated review list for one master table.
   *
   * `isActive` omitted deliberately returns deactivated rows too — the admin
   * needs to see what was soft-deleted in order to bring it back.
   */
  async list(resource: MasterDataResource, dto: ListMasterDataDto) {
    const table = TABLES[resource];
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (dto.type) conditions.push(eq(table.type, dto.type));
    if (dto.isActive !== undefined) conditions.push(eq(table.isActive, dto.isActive));
    const term = dto.q?.trim();
    if (term) {
      conditions.push(sql`${table.name} ILIKE ${`%${escapeLikePattern(term)}%`}`);
    }
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [items, countResult] = await Promise.all([
      this.db
        .select({
          id: table.id,
          name: table.name,
          type: table.type,
          isActive: table.isActive,
          createdAt: table.createdAt,
          updatedAt: table.updatedAt,
        })
        .from(table)
        .where(whereClause)
        .orderBy(table.type, sql`lower(btrim(${table.name}))`)
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Rename, promote (`type: 'master-typed'`) or reactivate one row.
   *
   * The rename is checked against the unique `lower(btrim(name))` index before
   * the write, so a clash comes back as a 409 rather than a raw constraint
   * error. The same error is caught around the update as well, in case another
   * admin saved the same name in between.
   */
  async update(resource: MasterDataResource, id: string, dto: UpdateMasterDataDto) {
    const table = TABLES[resource];
    const label = LABELS[resource];
    const existing = await this.findOrFail(resource, id);

    const name = dto.name?.trim();
    if (name && name.toLowerCase() !== existing.name.trim().toLowerCase()) {
      const clash = await this.db
        .select({ id: table.id, name: table.name })
        .from(table)
        .where(and(sql`lower(btrim(${table.name})) = ${name.toLowerCase()}`, ne(table.id, id)))
        .limit(1);

      if (clash.length) {
        throw new ConflictException(`${label} "${clash[0].name}" already exists`);
      }
    }

    const changes: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) changes.name = name;
    if (dto.type !== undefined) changes.type = dto.type;
    if (dto.isActive !== undefined) changes.isActive = dto.isActive;

    try {
      await this.db
        .update(table)
        .set(changes as any)
        .where(eq(table.id, id));
    } catch (err: any) {
      if (err?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(`${label} "${name}" already exists`);
      }
      throw err;
    }

    return this.findOrFail(resource, id);
  }

  /**
   * Soft delete: `isActive = false`.
   *
   * Never a hard delete. `jobs.title`, `jobs.qualification` and
   * `jobs.certification` are plain text columns with no FK to these tables, so
   * removing a row cannot corrupt a posting — but the row is the only record
   * that the value was ever reviewed, and deactivating keeps that while
   * dropping it out of the employer dropdowns.
   */
  async softDelete(resource: MasterDataResource, id: string) {
    const table = TABLES[resource];
    await this.findOrFail(resource, id);

    await this.db
      .update(table)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(table.id, id));

    return this.findOrFail(resource, id);
  }

  /**
   * Active `user-typed` rows per table — the number the admin nav badges.
   */
  async pendingCounts() {
    const [jobTitles, qualifications, certifications] = await Promise.all([
      this.countPending('job-titles'),
      this.countPending('qualifications'),
      this.countPending('certifications'),
    ]);

    return { jobTitles, qualifications, certifications };
  }

  private async countPending(resource: MasterDataResource): Promise<number> {
    const table = TABLES[resource];
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(table)
      .where(and(eq(table.isActive, true), eq(table.type, 'user-typed')));

    return Number(result[0]?.count || 0);
  }

  private async findOrFail(resource: MasterDataResource, id: string) {
    const table = TABLES[resource];
    const rows = await this.db
      .select({
        id: table.id,
        name: table.name,
        type: table.type,
        isActive: table.isActive,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
      })
      .from(table)
      .where(eq(table.id, id))
      .limit(1);

    if (!rows.length) throw new NotFoundException(`${LABELS[resource]} not found`);
    return rows[0];
  }
}
