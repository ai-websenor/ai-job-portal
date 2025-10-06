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
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FastifyFileInterceptor } from '../common/interceptors/fastify-file.interceptor';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ResumesService } from './resumes.service';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ProfileService } from '../profile/profile.service';

@ApiTags('resumes')
@Controller('resumes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResumesController {
  constructor(
    private readonly resumesService: ResumesService,
    private readonly profileService: ProfileService,
  ) { }

  @Post('upload')
  @UseInterceptors(FastifyFileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload resume file' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'resumeName'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        resumeName: {
          type: 'string',
        },
        isDefault: {
          type: 'boolean',
        },
        isBuiltWithBuilder: {
          type: 'boolean',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Resume uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or request' })
  async uploadResume(
    @GetUser('id') userId: string,
    @UploadedFile() file: any,
    @Body('resumeName') resumeName: string,
    @Body('isDefault') isDefault?: boolean,
    @Body('isBuiltWithBuilder') isBuiltWithBuilder?: boolean,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!resumeName) {
      throw new BadRequestException('resumeName is required');
    }

    const profile = await this.profileService.findByUserId(userId);

    return this.resumesService.uploadResume(
      profile.id,
      userId,
      file.buffer,
      file.originalname,
      file.mimetype,
      {
        resumeName,
        isDefault: isDefault === true,
        isBuiltWithBuilder: isBuiltWithBuilder === true,
      },
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all resumes' })
  @ApiResponse({ status: 200, description: 'List of resumes' })
  async findAll(@GetUser('id') userId: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.findAllByProfile(profile.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resume by ID' })
  @ApiResponse({ status: 200, description: 'Resume details' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async findOne(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.findOne(id, profile.id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get download URL for resume' })
  @ApiResponse({ status: 200, description: 'Pre-signed download URL' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getDownloadUrl(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Query('expiresIn') expiresIn?: number,
  ) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.getDownloadUrl(id, profile.id, expiresIn);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update resume metadata' })
  @ApiResponse({ status: 200, description: 'Resume updated successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateResumeDto,
  ) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.update(id, profile.id, updateDto);
  }

  @Put(':id/default')
  @ApiOperation({ summary: 'Set resume as default' })
  @ApiResponse({ status: 200, description: 'Resume set as default successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async setDefault(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.setDefault(id, profile.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete resume' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async delete(@GetUser('id') userId: string, @Param('id') id: string) {
    const profile = await this.profileService.findByUserId(userId);
    return this.resumesService.delete(id, profile.id);
  }
}
