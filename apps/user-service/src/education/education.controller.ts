import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EducationService } from './education.service';
import { UpdateEducationDto } from './dto/update-education.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ProfileService } from '../profile/profile.service';

@ApiTags('candidate-education')
@Controller('candidate/education')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EducationController {
  constructor(
    private readonly educationService: EducationService,
    private readonly profileService: ProfileService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all education records' })
  @ApiResponse({ status: 200, description: 'List of education records' })
  async findAll(@GetUser('id') userId: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.educationService.findAllByProfile(profile.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get education record by ID' })
  @ApiResponse({ status: 200, description: 'Education record details' })
  @ApiResponse({ status: 404, description: 'Education not found' })
  async findOne(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.educationService.findOne(id, profile.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update education record' })
  @ApiResponse({ status: 200, description: 'Education updated successfully' })
  @ApiResponse({ status: 404, description: 'Education not found' })
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateEducationDto,
  ) {
    const profile = await this.profileService.findByUserId(userId);
    return this.educationService.update(id, profile.id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete education record' })
  @ApiResponse({ status: 200, description: 'Education deleted successfully' })
  @ApiResponse({ status: 404, description: 'Education not found' })
  async delete(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.educationService.delete(id, profile.id);
  }
}
