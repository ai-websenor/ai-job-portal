import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SkillService } from './skill.service';
import { Public, Roles, RolesGuard } from '@ai-job-portal/common';

@ApiTags('skills')
@Controller('skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search skills' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  search(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.skillService.search(query, limit || 20);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all skills' })
  @ApiQuery({ name: 'categoryId', required: false })
  findAll(@Query('categoryId') categoryId?: string) {
    return this.skillService.findAll(categoryId);
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: 'Get popular skills' })
  getPopular(@Query('limit') limit?: number) {
    return this.skillService.getPopularSkills(limit || 20);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get skill by ID' })
  findById(@Param('id') id: string) {
    return this.skillService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create skill (admin)' })
  create(@Body() dto: { name: string; categoryId?: string }) {
    return this.skillService.create(dto);
  }
}
