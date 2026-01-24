import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { DocumentService } from './document.service';
import { UploadDocumentDto, DocumentQueryDto } from './dto';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('candidates/documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiOperation({ summary: 'Upload document metadata' })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  upload(@CurrentUser('sub') userId: string, @Body() dto: UploadDocumentDto) {
    return this.documentService.upload(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved' })
  findAll(@CurrentUser('sub') userId: string, @Query() query: DocumentQueryDto) {
    return this.documentService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.documentService.findOne(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.documentService.remove(userId, id);
  }
}
