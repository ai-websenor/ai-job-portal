import { Controller, Post, Body, Get } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'The category has been successfully created.' })
  createHttp(@Body() data: CreateCategoryDto) {
    return this.categoryService.create(data);
  }

  @GrpcMethod('JobService', 'CreateCategory')
  create(data: CreateCategoryDto) {
    return this.categoryService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Find all categories' })
  @ApiResponse({ status: 200, description: 'Return all categories.' })
  findAllHttp() {
    return this.categoryService.findAll();
  }

  @GrpcMethod('JobService', 'FindAllCategories')
  findAll() {
    return this.categoryService.findAll();
  }
}
