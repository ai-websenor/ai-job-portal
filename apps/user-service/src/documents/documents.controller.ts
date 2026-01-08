import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FastifyFileInterceptor } from '../common/interceptors/fastify-file.interceptor';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ProfileService } from '../profile/profile.service';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly profileService: ProfileService,
  ) {}

  @Post('upload')
  @UseInterceptors(FastifyFileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload document' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: {
          type: 'string',
          enum: ['resume', 'cover_letter', 'certificate', 'id_proof', 'portfolio', 'other'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  async uploadDocument(
    @GetUser('id') userId: string,
    @UploadedFile() file: any,
    @Query('documentType') documentType: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const profile = await this.profileService.findByUserId(userId);

    return this.documentsService.uploadDocument(
      profile.id,
      userId,
      file.buffer,
      file.originalname,
      file.mimetype,
      documentType as any,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  async findAll(@GetUser('id') userId: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.documentsService.findAllByProfile(profile.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document details' })
  async findOne(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.documentsService.findOne(id, profile.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for document' })
  @ApiResponse({ status: 200, description: 'Pre-signed download URL' })
  async getDownloadUrl(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Query('expiresIn') expiresIn?: number,
  ) {
    const profile = await this.profileService.findByUserId(userId);
    return this.documentsService.getDownloadUrl(id, profile.id, expiresIn);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  async delete(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.documentsService.delete(id, profile.id);
  }
}
