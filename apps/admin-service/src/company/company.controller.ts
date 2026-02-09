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
  @ApiOperation({
    summary: 'Create company with optional logo, banner, and verification document uploads',
    description: `
      Supports TWO formats:

      1. JSON (application/json) - Text fields only, no file uploads
      2. Multipart Form Data (multipart/form-data) - Text fields + optional file uploads

      Multipart Form Fields:
      - Text Fields: name (required), industry, companySize, companyType, yearEstablished, website,
        description, mission, culture, benefits, tagline, headquarters, employeeCount,
        linkedinUrl, twitterUrl, facebookUrl, panNumber, gstNumber, cinNumber

      - File Fields (optional):
        * logo: Logo image (JPEG, PNG, WebP, max 2MB)
        * banner: Banner image (JPEG, PNG, WebP, max 5MB)
        * verificationDocument: KYC/PAN/GST document (JPG, PNG, PDF, DOC, DOCX, max 10MB)
    `,
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        // Required fields
        name: { type: 'string', description: 'Company name (required)' },

        // Optional text fields
        industry: { type: 'string' },
        companySize: { type: 'string', enum: ['1-10', '11-50', '51-200', '201-500', '500+'] },
        companyType: { type: 'string', enum: ['startup', 'sme', 'mnc', 'government'] },
        yearEstablished: { type: 'number' },
        website: { type: 'string' },
        description: { type: 'string' },
        mission: { type: 'string' },
        culture: { type: 'string' },
        benefits: { type: 'string' },
        tagline: { type: 'string' },
        headquarters: { type: 'string' },
        employeeCount: { type: 'number' },
        linkedinUrl: { type: 'string' },
        twitterUrl: { type: 'string' },
        facebookUrl: { type: 'string' },
        panNumber: { type: 'string' },
        gstNumber: { type: 'string' },
        cinNumber: { type: 'string' },

        // Optional file fields
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Logo image file (JPEG, PNG, WebP, max 2MB)',
        },
        banner: {
          type: 'string',
          format: 'binary',
          description: 'Banner image file (JPEG, PNG, WebP, max 5MB)',
        },
        verificationDocument: {
          type: 'string',
          format: 'binary',
          description: 'Business verification document (JPG, PNG, PDF, DOC, DOCX, max 10MB)',
        },
      },
      required: ['name'],
    },
  })
  @ApiResponse({ status: 201, description: 'Company created successfully with uploaded files' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed or invalid file type/size',
  })
  @ApiResponse({ status: 409, description: 'Conflict - company already exists for this user' })
  async create(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Req() req: FastifyRequest,
  ) {
    // Check if request is multipart (with files) or JSON
    const contentType = req.headers['content-type'] || '';
    console.log(`[CompanyController.create] Content-Type: ${contentType}`);

    if (contentType.includes('multipart/form-data')) {
      // Handle multipart form with files
      console.log('[CompanyController.create] Handling multipart request with files');
      return this.companyService.createWithFiles(userId, req, role);
    } else {
      // Handle regular JSON request (backward compatibility)
      console.log('[CompanyController.create] Handling JSON request');
      const dto = req.body as CreateCompanyDto;
      return this.companyService.create(userId, dto, role);
    }
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
  @ApiOperation({
    summary: 'Upload company logo (JPEG, PNG, WebP, max 2MB) - requires UPDATE_COMPANY permission',
  })
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
  @ApiOperation({
    summary:
      'Upload company banner (JPEG, PNG, WebP, max 5MB) - requires UPDATE_COMPANY permission',
  })
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
