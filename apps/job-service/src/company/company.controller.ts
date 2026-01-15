/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyResponseDto } from './dto/company-response.dto';
import { CompanyJobsQueryDto } from './dto/company-jobs-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '@ai-job-portal/common';
import { UserRole } from '@ai-job-portal/common';

@ApiTags('Company Profile')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get authenticated employer company profile',
    description:
      'Retrieve the company profile for the authenticated employer without needing the company ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Company profile retrieved successfully',
    type: CompanyResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not an employer',
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found or employer not linked to a company',
  })
  async findMyCompany(@Request() req) {
    return this.companyService.findMyCompany(req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID (public)' })
  @ApiResponse({
    status: 200,
    description: 'Company retrieved successfully',
    type: CompanyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update company profile (employer only)',
    description:
      'Update company profile fields. ' +
      'Allowed fields: description, website, logoUrl, bannerUrl, tagline, industry, companySize, yearEstablished, mission, culture, benefits. ' +
      'Read-only fields (name, slug, companyType, isVerified) cannot be updated via this endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Company updated successfully',
    type: CompanyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid field values or attempting to update read-only fields (name, slug, companyType)',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not company owner' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCompanyDto,
    @Request() req,
  ) {
    return this.companyService.update(id, updateDto, req.user);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get company by slug (public)',
    description:
      'Retrieve company profile using URL-safe slug identifier. ' +
      'Slug is used for public company pages (e.g., /companies/slug/google). ' +
      'No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Company retrieved successfully',
    type: CompanyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.companyService.findBySlug(slug);
  }

  @Get(':id/jobs')
  @ApiOperation({
    summary: 'Get all jobs for a company (public)',
    description:
      'Retrieve paginated list of active jobs for a specific company. ' +
      'No authentication required. Default sorting by creation date (newest first).',
  })
  @ApiResponse({
    status: 200,
    description: 'Jobs retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async getCompanyJobs(
    @Param('id') id: string,
    @Query() query: CompanyJobsQueryDto,
  ) {
    return this.companyService.getCompanyJobs(id, query);
  }
}
