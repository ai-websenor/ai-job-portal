import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { CertificationService } from './certification.service';
import { CreateCertificationDto, UpdateCertificationDto } from './dto';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('candidates/certifications')
export class CertificationController {
  constructor(private readonly certificationService: CertificationService) {}

  @Post()
  @ApiOperation({ summary: 'Add certification' })
  @ApiResponse({ status: 201, description: 'Certification added' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateCertificationDto) {
    return this.certificationService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all certifications' })
  @ApiResponse({ status: 200, description: 'Certifications retrieved' })
  findAll(@CurrentUser('sub') userId: string) {
    return this.certificationService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certification by ID' })
  @ApiParam({ name: 'id', description: 'Certification ID' })
  @ApiResponse({ status: 200, description: 'Certification retrieved' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.certificationService.findOne(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update certification' })
  @ApiParam({ name: 'id', description: 'Certification ID' })
  @ApiResponse({ status: 200, description: 'Certification updated' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCertificationDto,
  ) {
    return this.certificationService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete certification' })
  @ApiParam({ name: 'id', description: 'Certification ID' })
  @ApiResponse({ status: 200, description: 'Certification deleted' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.certificationService.remove(userId, id);
  }
}
