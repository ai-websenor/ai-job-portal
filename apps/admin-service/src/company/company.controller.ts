import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { CurrentUser, Public, RequirePermissions, PermissionsGuard } from '@ai-job-portal/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto, UpdateCompanyDto, CompanyQueryDto } from './dto';

@ApiTags('companies')
@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('CREATE_COMPANY')
  @ApiOperation({ summary: 'Create company (requires CREATE_COMPANY permission)' })
  @ApiResponse({ status: 201, description: 'Company created' })
  create(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companyService.create(userId, dto, role);
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('UPDATE_COMPANY')
  @ApiOperation({ summary: 'Update company (requires UPDATE_COMPANY permission)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company updated' })
  update(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.update(userId, id, dto, role);
  }

  @Post(':id/logo')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('UPDATE_COMPANY')
  @ApiOperation({ summary: 'Upload company logo (JPEG, PNG, WebP, max 2MB) - requires UPDATE_COMPANY permission' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 200, description: 'Logo uploaded' })
  async uploadLogo(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    return this.companyService.uploadLogo(
      userId,
      id,
      {
        buffer,
        originalname: data.filename,
        mimetype: data.mimetype,
        size: buffer.length,
      },
      role,
    );
  }

  @Post(':id/banner')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('UPDATE_COMPANY')
  @ApiOperation({ summary: 'Upload company banner (JPEG, PNG, WebP, max 5MB) - requires UPDATE_COMPANY permission' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 200, description: 'Banner uploaded' })
  async uploadBanner(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    return this.companyService.uploadBanner(
      userId,
      id,
      {
        buffer,
        originalname: data.filename,
        mimetype: data.mimetype,
        size: buffer.length,
      },
      role,
    );
  }

  @Post(':id/verification-document')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('UPDATE_COMPANY')
  @ApiOperation({
    summary:
      'Upload business verification document (KYC/PAN/GST - JPG, PNG, PDF, DOC, DOCX, max 10MB) - requires UPDATE_COMPANY permission',
  })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiResponse({ status: 200, description: 'Verification document uploaded' })
  async uploadVerificationDocument(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    return this.companyService.uploadVerificationDocument(
      userId,
      id,
      {
        buffer,
        originalname: data.filename,
        mimetype: data.mimetype,
        size: buffer.length,
      },
      role,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('DELETE_COMPANY')
  @ApiOperation({ summary: 'Delete company (requires DELETE_COMPANY permission)' })
  @ApiParam({ name: 'id', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company deleted' })
  delete(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    return this.companyService.delete(userId, id, role);
  }
}
