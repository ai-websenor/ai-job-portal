import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CandidateService } from './candidate.service';
import { CurrentUser } from '@ai-job-portal/common';
import { CreateCandidateProfileDto, UpdateCandidateProfileDto, AddExperienceDto, AddEducationDto, UpdateExperienceDto, UpdateEducationDto, ProfileViewQueryDto } from './dto';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('candidates')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  // Profile
  @Post('profile')
  @ApiOperation({ summary: 'Create candidate profile' })
  @ApiResponse({ status: 201, description: 'Profile created' })
  createProfile(@CurrentUser('sub') userId: string, @Body() dto: CreateCandidateProfileDto) {
    return this.candidateService.createProfile(userId, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get candidate profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  getProfile(@CurrentUser('sub') userId: string) {
    return this.candidateService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update candidate profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateCandidateProfileDto) {
    return this.candidateService.updateProfile(userId, dto);
  }

  // Work Experience
  @Post('experiences')
  @ApiOperation({ summary: 'Add work experience' })
  @ApiResponse({ status: 201, description: 'Experience added' })
  addExperience(@CurrentUser('sub') userId: string, @Body() dto: AddExperienceDto) {
    return this.candidateService.addExperience(userId, dto);
  }

  @Get('experiences')
  @ApiOperation({ summary: 'Get all work experiences' })
  @ApiResponse({ status: 200, description: 'Experiences retrieved' })
  getExperiences(@CurrentUser('sub') userId: string) {
    return this.candidateService.getExperiences(userId);
  }

  @Get('experiences/:id')
  @ApiOperation({ summary: 'Get work experience by ID' })
  @ApiParam({ name: 'id', description: 'Experience ID' })
  @ApiResponse({ status: 200, description: 'Experience retrieved' })
  getExperience(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.candidateService.getExperience(userId, id);
  }

  @Put('experiences/:id')
  @ApiOperation({ summary: 'Update work experience' })
  @ApiParam({ name: 'id', description: 'Experience ID' })
  @ApiResponse({ status: 200, description: 'Experience updated' })
  updateExperience(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.candidateService.updateExperience(userId, id, dto);
  }

  @Delete('experiences/:id')
  @ApiOperation({ summary: 'Delete work experience' })
  @ApiParam({ name: 'id', description: 'Experience ID' })
  @ApiResponse({ status: 200, description: 'Experience deleted' })
  removeExperience(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.candidateService.removeExperience(userId, id);
  }

  // Education
  @Post('education')
  @ApiOperation({ summary: 'Add education' })
  @ApiResponse({ status: 201, description: 'Education added' })
  addEducation(@CurrentUser('sub') userId: string, @Body() dto: AddEducationDto) {
    return this.candidateService.addEducation(userId, dto);
  }

  @Get('education')
  @ApiOperation({ summary: 'Get all education records' })
  @ApiResponse({ status: 200, description: 'Education records retrieved' })
  getEducations(@CurrentUser('sub') userId: string) {
    return this.candidateService.getEducations(userId);
  }

  @Get('education/:id')
  @ApiOperation({ summary: 'Get education by ID' })
  @ApiParam({ name: 'id', description: 'Education ID' })
  @ApiResponse({ status: 200, description: 'Education retrieved' })
  getEducation(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.candidateService.getEducation(userId, id);
  }

  @Put('education/:id')
  @ApiOperation({ summary: 'Update education' })
  @ApiParam({ name: 'id', description: 'Education ID' })
  @ApiResponse({ status: 200, description: 'Education updated' })
  updateEducation(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEducationDto,
  ) {
    return this.candidateService.updateEducation(userId, id, dto);
  }

  @Delete('education/:id')
  @ApiOperation({ summary: 'Delete education' })
  @ApiParam({ name: 'id', description: 'Education ID' })
  @ApiResponse({ status: 200, description: 'Education deleted' })
  removeEducation(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.candidateService.removeEducation(userId, id);
  }

  // Profile Views
  @Get('profile-views')
  @ApiOperation({ summary: 'Get who viewed your profile' })
  @ApiResponse({ status: 200, description: 'Profile views retrieved' })
  getProfileViews(@CurrentUser('sub') userId: string, @Query() query: ProfileViewQueryDto) {
    return this.candidateService.getProfileViews(userId, query);
  }
}
