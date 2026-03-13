import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { Database, masterDegrees, masterFieldsOfStudy } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import {
  CreateDegreeDto,
  UpdateDegreeDto,
  CreateFieldOfStudyDto,
  UpdateFieldOfStudyDto,
  DegreeQueryDto,
  FieldOfStudyQueryDto,
} from './dto';

@Injectable()
export class EducationService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  // ---- Public endpoints (candidate onboarding) ----

  async getPublicDegrees(search?: string, level?: string) {
    let whereClause: any = and(
      eq(masterDegrees.isActive, true),
      eq(masterDegrees.type, 'master-typed'),
    );
    if (level) whereClause = and(whereClause, eq(masterDegrees.level, level as any));
    if (search) whereClause = and(whereClause, ilike(masterDegrees.name, `%${search}%`));

    return this.db.query.masterDegrees.findMany({
      where: whereClause,
      orderBy: (d, { asc }) => [asc(d.level), asc(d.name)],
    });
  }

  async getPublicFieldsOfStudy(degreeId: string, search?: string) {
    const degree = await this.db.query.masterDegrees.findFirst({
      where: and(eq(masterDegrees.id, degreeId), eq(masterDegrees.isActive, true)),
    });
    if (!degree) throw new NotFoundException('Degree not found');

    let whereClause: any = and(
      eq(masterFieldsOfStudy.degreeId, degreeId),
      eq(masterFieldsOfStudy.isActive, true),
      eq(masterFieldsOfStudy.type, 'master-typed'),
    );
    if (search) whereClause = and(whereClause, ilike(masterFieldsOfStudy.name, `%${search}%`));

    return this.db.query.masterFieldsOfStudy.findMany({
      where: whereClause,
      orderBy: (f, { asc }) => [asc(f.name)],
    });
  }

  // ---- Admin: Degrees ----

  async getAllDegrees(query: DegreeQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const offset = (page - 1) * limit;

    let whereClause: any = eq(masterDegrees.isActive, true);

    if (query.type) {
      whereClause = and(whereClause, eq(masterDegrees.type, query.type as any));
    }

    if (query.level) {
      whereClause = and(whereClause, eq(masterDegrees.level, query.level as any));
    }

    if (query.search) {
      whereClause = and(whereClause, ilike(masterDegrees.name, `%${query.search}%`));
    }

    const [rows, totalRows] = await Promise.all([
      this.db.query.masterDegrees.findMany({
        where: whereClause,
        orderBy: (d, { asc }) => [asc(d.type), asc(d.level), asc(d.name)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(masterDegrees)
        .where(whereClause ?? sql`true`)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows,
      meta: {
        total: totalRows,
        page,
        limit,
        totalPages: Math.ceil(totalRows / limit),
      },
    };
  }

  async createDegree(dto: CreateDegreeDto) {
    const [degree] = await this.db
      .insert(masterDegrees)
      .values({
        name: dto.name.trim(),
        level: dto.level as any,
        isActive: true,
      })
      .returning();
    return degree;
  }

  async updateDegree(id: string, dto: UpdateDegreeDto) {
    const existing = await this.db.query.masterDegrees.findFirst({
      where: eq(masterDegrees.id, id),
    });
    if (!existing) throw new NotFoundException('Degree not found');

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.level !== undefined) updateData.level = dto.level;
    if (dto.type !== undefined) updateData.type = dto.type;

    const [updated] = await this.db
      .update(masterDegrees)
      .set(updateData)
      .where(eq(masterDegrees.id, id))
      .returning();

    return updated;
  }

  async deleteDegree(id: string) {
    const existing = await this.db.query.masterDegrees.findFirst({
      where: eq(masterDegrees.id, id),
    });
    if (!existing) throw new NotFoundException('Degree not found');

    // Count linked fields of study
    const fosCount = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(masterFieldsOfStudy)
      .where(eq(masterFieldsOfStudy.degreeId, id))
      .then((r) => r[0]?.count ?? 0);

    if (fosCount > 0) {
      // Soft delete — keep the record but deactivate
      await this.db
        .update(masterDegrees)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(masterDegrees.id, id));
      return {
        success: true,
        softDeleted: true,
        message: `Degree has ${fosCount} field(s) of study. It has been deactivated instead of deleted.`,
      };
    }

    await this.db.delete(masterDegrees).where(eq(masterDegrees.id, id));
    return { success: true, softDeleted: false };
  }

  // ---- Fields of Study ----

  async getFieldsOfStudy(degreeId: string, query: FieldOfStudyQueryDto) {
    const degree = await this.db.query.masterDegrees.findFirst({
      where: eq(masterDegrees.id, degreeId),
    });
    if (!degree) throw new NotFoundException('Degree not found');

    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const offset = (page - 1) * limit;

    let whereClause: any = and(
      eq(masterFieldsOfStudy.degreeId, degreeId),
      eq(masterFieldsOfStudy.isActive, true),
    );

    if (query.type) {
      whereClause = and(whereClause, eq(masterFieldsOfStudy.type, query.type as any));
    }

    if (query.search) {
      whereClause = and(whereClause, ilike(masterFieldsOfStudy.name, `%${query.search}%`));
    }

    const [rows, totalRows] = await Promise.all([
      this.db.query.masterFieldsOfStudy.findMany({
        where: whereClause,
        orderBy: (f, { asc }) => [asc(f.type), asc(f.name)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(masterFieldsOfStudy)
        .where(whereClause)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows,
      meta: {
        total: totalRows,
        page,
        limit,
        totalPages: Math.ceil(totalRows / limit),
      },
    };
  }

  async createFieldOfStudy(degreeId: string, dto: CreateFieldOfStudyDto) {
    const degree = await this.db.query.masterDegrees.findFirst({
      where: eq(masterDegrees.id, degreeId),
    });
    if (!degree) throw new NotFoundException('Degree not found');

    const [field] = await this.db
      .insert(masterFieldsOfStudy)
      .values({
        degreeId,
        name: dto.name.trim(),
        isActive: true,
      })
      .returning();

    return field;
  }

  async updateFieldOfStudy(id: string, dto: UpdateFieldOfStudyDto) {
    const existing = await this.db.query.masterFieldsOfStudy.findFirst({
      where: eq(masterFieldsOfStudy.id, id),
    });
    if (!existing) throw new NotFoundException('Field of study not found');

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.type !== undefined) updateData.type = dto.type;

    const [updated] = await this.db
      .update(masterFieldsOfStudy)
      .set(updateData)
      .where(eq(masterFieldsOfStudy.id, id))
      .returning();

    return updated;
  }

  async deleteFieldOfStudy(id: string) {
    const existing = await this.db.query.masterFieldsOfStudy.findFirst({
      where: eq(masterFieldsOfStudy.id, id),
    });
    if (!existing) throw new NotFoundException('Field of study not found');

    await this.db.delete(masterFieldsOfStudy).where(eq(masterFieldsOfStudy.id, id));
    return { success: true };
  }

  // ---- Helper Methods for Auto-Creating User-Typed Entries ----

  /**
   * Find or create degree as user-typed
   * Used when candidates enter a degree that doesn't exist in master list
   */
  async findOrCreateDegree(degreeName: string, level?: string) {
    // Try to find existing degree (case-insensitive)
    let degree = await this.db.query.masterDegrees.findFirst({
      where: ilike(masterDegrees.name, degreeName),
    });

    // If not found, create as user-typed
    if (!degree) {
      const [newDegree] = await this.db
        .insert(masterDegrees)
        .values({
          name: degreeName.trim(),
          level: (level as any) || 'bachelors', // Default to bachelors if not specified
          type: 'user-typed',
          isActive: true,
        })
        .returning();
      degree = newDegree;
    }

    return degree;
  }

  /**
   * Find or create field of study as user-typed
   * Used when candidates enter a field that doesn't exist in master list
   */
  async findOrCreateFieldOfStudy(fieldName: string, degreeId: string) {
    // Try to find existing field of study for this degree (case-insensitive)
    let field = await this.db.query.masterFieldsOfStudy.findFirst({
      where: and(
        eq(masterFieldsOfStudy.degreeId, degreeId),
        ilike(masterFieldsOfStudy.name, fieldName),
      ),
    });

    // If not found, create as user-typed
    if (!field) {
      const [newField] = await this.db
        .insert(masterFieldsOfStudy)
        .values({
          degreeId,
          name: fieldName.trim(),
          type: 'user-typed',
          isActive: true,
        })
        .returning();
      field = newField;
    }

    return field;
  }
}
