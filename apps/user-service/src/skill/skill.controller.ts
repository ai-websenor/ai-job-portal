import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public, Roles, RolesGuard } from '@ai-job-portal/common';
import { SkillService } from './skill.service';
import {
  AddProfileSkillDto,
  BulkAddProfileSkillDto,
  UpdateProfileSkillDto,
  SkillQueryDto,
  AdminSkillQueryDto,
  UpdateMasterSkillDto,
} from './dto';

@ApiTags('skills')
@Controller()
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  // Master skills list (public - only master-typed for candidate suggestions)
  @Get('skills')
  @Public()
  @ApiOperation({ summary: 'Get all available skills' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Skills list retrieved' })
  getAllSkills(@Query() query: SkillQueryDto) {
    return this.skillService.getAllSkills(query);
  }

  // Admin: paginated list of all skills including user-typed
  @Get('master-data/skills')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get all skills (admin) - paginated with type filter' })
  @ApiResponse({ status: 200, description: 'Admin skills list retrieved' })
  getAllSkillsAdmin(@Query() query: AdminSkillQueryDto) {
    return this.skillService.getAllSkillsAdmin(query);
  }

  // Admin: create a master skill
  @Post('skills')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create master skill (admin)' })
  @ApiResponse({ status: 201, description: 'Skill created' })
  async createSkill(@Body() dto: { name: string; category?: string }) {
    const skill = await this.skillService.createMasterSkill(dto);
    return { message: 'Skill created successfully', data: skill };
  }

  // Admin: update a skill
  @Put('skills/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update skill name or type (admin)' })
  @ApiParam({ name: 'id', description: 'Skill ID' })
  @ApiResponse({ status: 200, description: 'Skill updated' })
  async updateSkill(@Param('id') id: string, @Body() dto: UpdateMasterSkillDto) {
    const skill = await this.skillService.updateSkill(id, dto);
    return { message: 'Skill updated successfully', data: skill };
  }

  // Admin: delete a skill
  @Delete('skills/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete skill (admin)' })
  @ApiParam({ name: 'id', description: 'Skill ID' })
  @ApiResponse({ status: 200, description: 'Skill deleted' })
  async deleteSkill(@Param('id') id: string) {
    return this.skillService.deleteSkill(id);
  }

  // Profile skills
  @Post('candidates/skills')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add skill to profile' })
  @ApiResponse({ status: 201, description: 'Skill added to profile' })
  async addSkill(@CurrentUser('sub') userId: string, @Body() dto: AddProfileSkillDto) {
    const skill = await this.skillService.addSkill(userId, dto);
    return { message: 'Skill added successfully', data: skill };
  }

  @Post('candidates/skills/bulk')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add multiple skills to profile' })
  @ApiResponse({ status: 201, description: 'Skills added to profile' })
  async addSkillsBulk(@CurrentUser('sub') userId: string, @Body() dto: BulkAddProfileSkillDto) {
    const result = await this.skillService.addSkillsBulk(userId, dto);
    return { message: 'Skills added successfully', data: result };
  }

  @Get('candidates/skills')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get profile skills' })
  @ApiResponse({ status: 200, description: 'Profile skills retrieved' })
  getProfileSkills(@CurrentUser('sub') userId: string) {
    return this.skillService.getProfileSkills(userId);
  }

  @Put('candidates/skills/:skillId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update profile skill' })
  @ApiParam({ name: 'skillId', description: 'Skill ID' })
  @ApiResponse({ status: 200, description: 'Skill updated' })
  updateProfileSkill(
    @CurrentUser('sub') userId: string,
    @Param('skillId') skillId: string,
    @Body() dto: UpdateProfileSkillDto,
  ) {
    return this.skillService.updateProfileSkill(userId, skillId, dto);
  }

  @Delete('candidates/skills/:skillId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Remove skill from profile' })
  @ApiParam({ name: 'skillId', description: 'Skill ID' })
  @ApiResponse({ status: 200, description: 'Skill removed' })
  removeSkill(@CurrentUser('sub') userId: string, @Param('skillId') skillId: string) {
    return this.skillService.removeSkill(userId, skillId);
  }
}
