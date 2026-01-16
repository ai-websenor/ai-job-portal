import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CandidateService } from './candidate.service';
import { CurrentUser } from '@ai-job-portal/common';
import { CreateCandidateProfileDto, UpdateCandidateProfileDto, AddExperienceDto, AddEducationDto } from './dto';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('candidates')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

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

  @Post('experience')
  @ApiOperation({ summary: 'Add work experience' })
  @ApiResponse({ status: 201, description: 'Experience added' })
  addExperience(@CurrentUser('sub') userId: string, @Body() dto: AddExperienceDto) {
    return this.candidateService.addExperience(userId, dto);
  }

  @Post('education')
  @ApiOperation({ summary: 'Add education' })
  @ApiResponse({ status: 201, description: 'Education added' })
  addEducation(@CurrentUser('sub') userId: string, @Body() dto: AddEducationDto) {
    return this.candidateService.addEducation(userId, dto);
  }
}
