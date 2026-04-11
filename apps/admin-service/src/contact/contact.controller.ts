import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactSubmissionDto, UpdateContactSubmissionDto, ContactQueryDto } from './dto';

// Public endpoint - no auth required (for frontend contact form)
@ApiTags('contact')
@Controller('contact')
export class PublicContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a contact form (public)' })
  async submitContact(@Body() dto: CreateContactSubmissionDto) {
    const submission = await this.contactService.create(dto);
    return { message: 'Your message has been sent successfully', data: submission };
  }
}

// Admin endpoints - auth required
@ApiTags('admin-contact')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/contact-submissions')
export class AdminContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'List all contact submissions' })
  async findAll(@Query() query: ContactQueryDto) {
    return this.contactService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact submission by ID' })
  async findOne(@Param('id') id: string) {
    return this.contactService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contact submission status/notes' })
  async update(@Param('id') id: string, @Body() dto: UpdateContactSubmissionDto) {
    return this.contactService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact submission' })
  async delete(@Param('id') id: string) {
    return this.contactService.delete(id);
  }
}
