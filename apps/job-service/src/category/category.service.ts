import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const [category] = await this.db
      .insert(schema.jobCategories)
      .values({
        name: createCategoryDto.name,
        slug: createCategoryDto.name.toLowerCase().replace(/ /g, '-'),
        description: createCategoryDto.description,
      })
      .returning();
    return {
      message: 'Category created successfully',
      ...category,
    };
  }

  async findAll() {
    const categories = await this.db.select().from(schema.jobCategories);
    return {
      message:
        categories.length > 0
          ? 'Categories retrieved successfully'
          : 'No categories found',
      categories,
    };
  }

  /*
  findOne(id: number) {
    return `This action returns a #${id} category`;
  }

  update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return `This action updates a #${id} category`;
  }

  remove(id: number) {
    return `This action removes a #${id} category`;
  }
  */
}
