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
import { CertificationsService } from './certifications.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ProfileService } from '../profile/profile.service';

@ApiTags('certifications')
@Controller('certifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CertificationsController {
  constructor(
    private readonly certificationsService: CertificationsService,
    private readonly profileService: ProfileService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add certification' })
  @ApiResponse({ status: 201, description: 'Certification added successfully' })
  async create(@GetUser('id') userId: string, @Body() createDto: CreateCertificationDto) {
    const profile = await this.profileService.findByUserId(userId);
    const certificates = await this.certificationsService.create(profile.id, createDto);
    return { ...certificates, message: 'Certification added successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all certifications' })
  @ApiResponse({ status: 200, description: 'List of certifications' })
  async findAll(@GetUser('id') userId: string) {
    const profile = await this.profileService.findByUserId(userId);
    const certificates = await this.certificationsService.findAllByProfile(profile.id);
    return { ...certificates, message: 'Certifications fetched successfuly' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certification by ID' })
  @ApiResponse({ status: 200, description: 'Certification details' })
  @ApiResponse({ status: 404, description: 'Certification not found' })
  async findOne(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    const certificate = await this.certificationsService.findOne(id, profile.id);
    return { ...certificate, message: 'Certificate fetched successfuly' };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update certification' })
  @ApiResponse({ status: 200, description: 'Certification updated successfully' })
  @ApiResponse({ status: 404, description: 'Certification not found' })
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateCertificationDto,
  ) {
    const profile = await this.profileService.findByUserId(userId);
    const certificate = await this.certificationsService.update(id, profile.id, updateDto);
    return { ...certificate, message: 'Certificate updated successfuly' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete certification' })
  @ApiResponse({ status: 200, description: 'Certification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Certification not found' })
  async delete(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    const result = await this.certificationsService.delete(id, profile.id);
    return { ...result, message: 'Certificate deleted successfuly' };
  }
}
