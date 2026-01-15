/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { CreateSkillDto } from './dto/create-skill.dto';

@Injectable()
export class SkillService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(createSkillDto: CreateSkillDto) {
    // Check if skill exists
    const [existing] = await this.db
      .select()
      .from(schema.skills)
      .where(eq(schema.skills.name, createSkillDto.name))
      .limit(1);

    if (existing) {
      return {
        message: 'Skill already exists',
        ...existing,
      };
    }

    const [skill] = await this.db
      .insert(schema.skills)
      .values({
        name: createSkillDto.name,
        isActive: true,
      } as any)
      .returning();
    return {
      message: 'Skill created successfully',
      ...skill,
    };
  }

  async findAll() {
    const skills = await this.db.select().from(schema.skills);
    return {
      message:
        skills.length > 0 ? 'Skills retrieved successfully' : 'No skills found',
      skills,
    };
  }

  /*
  findOne(id: number) {
    return `This action returns a #${id} skill`;
  }

  update(id: number, updateSkillDto: UpdateSkillDto) {
    return `This action updates a #${id} skill`;
  }

  remove(id: number) {
    return `This action removes a #${id} skill`;
  }
  */
}
