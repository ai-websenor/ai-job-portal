import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery} from '@nestjs/swagger';
import {SkillsService} from './skills.service';
import {UpdateProfileSkillDto} from './dto/update-profile-skill.dto';
import {JwtAuthGuard} from '../common/guards/jwt-auth.guard';
import {GetUser} from '../common/decorators/get-user.decorator';
import {ProfileService} from '../profile/profile.service';

@ApiTags('candidate-skills')
@Controller('candidate/skills')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SkillsController {
  constructor(
    private readonly skillsService: SkillsService,
    private readonly profileService: ProfileService,
  ) {}

  @Get()
  @ApiOperation({summary: 'Get all profile skills'})
  @ApiResponse({status: 200, description: 'List of profile skills'})
  async findAll(@GetUser('id') userId: string) {
    const profile = await this.profileService.findByUserId(userId);
    const skills = await this.skillsService.findAllByProfile(profile.id);
    return {data: skills, message: 'Skills fetched successfuly'};
  }

  @Get('suggestions')
  @ApiOperation({summary: 'Get skill suggestions based on query'})
  @ApiQuery({name: 'q', required: true, description: 'Search query'})
  @ApiQuery({name: 'limit', required: false, description: 'Max results', type: Number})
  @ApiResponse({status: 200, description: 'List of skill suggestions'})
  async getSuggestions(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.skillsService.getSkillSuggestions(
      query,
      limit ? parseInt(limit.toString(), 10) : 10,
    );
  }

  @Get('all')
  @ApiOperation({summary: 'Get all available skills'})
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['technical', 'soft'],
  })
  @ApiResponse({status: 200, description: 'List of all skills'})
  async getAllSkills(@Query('category') category?: string) {
    const skills = await this.skillsService.getAllSkills(category);
    return {data: skills, message: 'Skills fetched successfuly'};
  }

  @Get(':id')
  @ApiOperation({summary: 'Get profile skill by ID'})
  @ApiResponse({status: 200, description: 'Skill details'})
  @ApiResponse({status: 404, description: 'Skill not found'})
  async findOne(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    const skill = await this.skillsService.findOne(id, profile.id);
    return {data: skill, message: 'Skill fetched successfuly'};
  }

  @Put(':id')
  @ApiOperation({summary: 'Update profile skill'})
  @ApiResponse({status: 200, description: 'Skill updated successfully'})
  @ApiResponse({status: 404, description: 'Skill not found'})
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateProfileSkillDto,
  ) {
    const profile = await this.profileService.findByUserId(userId);
    const skill = await this.skillsService.update(id, profile.id, updateDto);
    return {data: skill, message: 'Skill updated successfully'};
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({summary: 'Remove skill from profile'})
  @ApiResponse({status: 200, description: 'Skill removed successfully'})
  @ApiResponse({status: 404, description: 'Skill not found'})
  async remove(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    const skill = await this.skillsService.remove(id, profile.id);
    return {data: skill, message: 'Skill removed successfully'};
  }
}
