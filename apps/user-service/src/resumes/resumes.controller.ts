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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ResumesService } from './resumes.service';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ProfileService } from '../profile/profile.service';

@ApiTags('candidate-resumes')
@Controller('candidate/resumes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResumesController {
  constructor(
    private readonly resumesService: ResumesService,
    private readonly profileService: ProfileService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all resumes' })
  @ApiResponse({ status: 200, description: 'List of resumes' })
  async findAll(@GetUser('id') userId: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.findAllByProfile(profile.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resume by ID' })
  @ApiResponse({ status: 200, description: 'Resume details' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async findOne(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.findOne(id, profile.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for resume' })
  @ApiResponse({ status: 200, description: 'Pre-signed download URL' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getDownloadUrl(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Query('expiresIn') expiresIn?: number,
  ) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.getDownloadUrl(id, profile.id, expiresIn);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update resume metadata' })
  @ApiResponse({ status: 200, description: 'Resume updated successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateResumeDto,
  ) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.update(id, profile.id, updateDto);
  }

  @Put(':id/default')
  @ApiOperation({ summary: 'Set resume as default' })
  @ApiResponse({ status: 200, description: 'Resume set as default successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async setDefault(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.setDefault(id, profile.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete resume' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async delete(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.delete(id, profile.id);
  }
}
