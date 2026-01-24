import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public } from '@ai-job-portal/common';
import { TestimonialService } from './testimonial.service';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto';

@ApiTags('testimonials')
@Controller('companies/:companyId/testimonials')
export class TestimonialController {
  constructor(private readonly testimonialService: TestimonialService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add testimonial' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Testimonial added' })
  create(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
    @Body() dto: CreateTestimonialDto,
  ) {
    return this.testimonialService.create(userId, companyId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get testimonials' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiQuery({ name: 'all', required: false, description: 'Include unapproved (owner only)' })
  @ApiResponse({ status: 200, description: 'Testimonials retrieved' })
  findAll(
    @Param('companyId') companyId: string,
    @Query('all') all?: string,
  ) {
    return this.testimonialService.findAll(companyId, all !== 'true');
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get testimonial by ID' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Testimonial ID' })
  @ApiResponse({ status: 200, description: 'Testimonial retrieved' })
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.testimonialService.findOne(companyId, id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update testimonial' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Testimonial ID' })
  @ApiResponse({ status: 200, description: 'Testimonial updated' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTestimonialDto,
  ) {
    return this.testimonialService.update(userId, companyId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete testimonial' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'id', description: 'Testimonial ID' })
  @ApiResponse({ status: 200, description: 'Testimonial deleted' })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.testimonialService.remove(userId, companyId, id);
  }
}
