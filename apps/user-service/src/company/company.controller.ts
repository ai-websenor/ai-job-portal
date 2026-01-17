import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public, Roles, RolesGuard } from '@ai-job-portal/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto, UpdateCompanyDto, CompanyQueryDto } from './dto';

@ApiTags('companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer')
  @ApiOperation({ summary: 'Create company' })
  @ApiResponse({ status: 201, description: 'Company created' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateCompanyDto) {
    return this.companyService.create(userId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List companies' })
  @ApiResponse({ status: 200, description: 'Companies retrieved' })
  findAll(@Query() query: CompanyQueryDto) {
    return this.companyService.findAll(query);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get my company' })
  @ApiResponse({ status: 200, description: 'Company retrieved' })
  getMyCompany(@CurrentUser('sub') userId: string) {
    return this.companyService.getMyCompany(userId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company retrieved' })
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(id);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get company by slug' })
  @ApiParam({ name: 'slug', description: 'Company slug' })
  @ApiResponse({ status: 200, description: 'Company retrieved' })
  findBySlug(@Param('slug') slug: string) {
    return this.companyService.findBySlug(slug);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company updated' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete company' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company deleted' })
  delete(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.companyService.delete(userId, id);
  }
}
