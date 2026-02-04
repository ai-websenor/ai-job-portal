import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SkillService } from './skill.service';
import { Public, RequirePermissions, PermissionsGuard } from '@ai-job-portal/common';

@ApiTags('skills')
@Controller('skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search skills' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async search(@Query('q') query: string, @Query('limit') limit?: number) {
    const skills = await this.skillService.search(query, limit || 20);
    return { message: 'Skills fetched successfully', data: skills };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all skills' })
  @ApiQuery({ name: 'category', required: false })
  async findAll(@Query('category') category?: string) {
    const skills = await this.skillService.findAll(category);
    return { message: 'Skills fetched successfully', data: skills };
  }

  @Get('popular')
  @Public()
  @ApiOperation({ summary: 'Get popular skills' })
  async getPopular(@Query('limit') limit?: number) {
    const skills = await this.skillService.getPopularSkills(limit || 20);
    return { message: 'Popular skills fetched successfully', data: skills };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get skill by ID' })
  async findById(@Param('id') id: string) {
    const skill = await this.skillService.findById(id);
    return { message: 'Skill fetched successfully', data: skill };
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('MANAGE_SETTINGS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create skill (requires MANAGE_SETTINGS permission)' })
  async create(@Body() dto: { name: string; category: string }) {
    const skill = await this.skillService.create(dto);
    return { message: 'Skill created successfully', statusCode: 201, data: skill };
  }
}
