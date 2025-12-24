import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkExperienceService } from './work-experience.service';
import { CreateWorkExperienceDto } from './dto/create-work-experience.dto';
import { UpdateWorkExperienceDto } from './dto/update-work-experience.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ProfileService } from '../profile/profile.service';

@ApiTags('candidate-experience')
@Controller('candidate/experience')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkExperienceController {
  constructor(
    private readonly workExperienceService: WorkExperienceService,
    private readonly profileService: ProfileService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add work experience' })
  @ApiResponse({ status: 201, description: 'Experience added successfully' })
  async create(
    @GetUser('id') userId: string,
    @Body() createDto: CreateWorkExperienceDto,
  ) {
    const profile = await this.profileService.findByUserId(userId);
    return this.workExperienceService.create(profile.id, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all work experiences' })
  @ApiResponse({ status: 200, description: 'List of work experiences' })
  async findAll(@GetUser('id') userId: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.workExperienceService.findAllByProfile(profile.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get work experience by ID' })
  @ApiResponse({ status: 200, description: 'Work experience details' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async findOne(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.workExperienceService.findOne(id, profile.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update work experience' })
  @ApiResponse({ status: 200, description: 'Experience updated successfully' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateWorkExperienceDto,
  ) {
    const profile = await this.profileService.findByUserId(userId);
    return this.workExperienceService.update(id, profile.id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete work experience' })
  @ApiResponse({ status: 200, description: 'Experience deleted successfully' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async delete(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.workExperienceService.delete(id, profile.id);
  }
}
