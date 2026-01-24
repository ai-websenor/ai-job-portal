import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public } from '@ai-job-portal/common';
import { SkillService } from './skill.service';
import { AddProfileSkillDto, UpdateProfileSkillDto, SkillQueryDto } from './dto';

@ApiTags('skills')
@Controller()
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  // Master skills list (public)
  @Get('skills')
  @Public()
  @ApiOperation({ summary: 'Get all available skills' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Skills list retrieved' })
  getAllSkills(@Query() query: SkillQueryDto) {
    return this.skillService.getAllSkills(query);
  }

  // Profile skills
  @Post('candidates/skills')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add skill to profile' })
  @ApiResponse({ status: 201, description: 'Skill added to profile' })
  addSkill(@CurrentUser('sub') userId: string, @Body() dto: AddProfileSkillDto) {
    return this.skillService.addSkill(userId, dto);
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
