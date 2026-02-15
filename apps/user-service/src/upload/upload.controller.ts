import {
  Controller,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { S3Service, UPLOAD_CONFIG } from '@ai-job-portal/aws';

class PresignUploadDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsNumber()
  fileSize: number;
}

@ApiTags('uploads')
@Controller('uploads')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('presign')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get presigned S3 upload URL' })
  @ApiResponse({ status: 200, description: 'Returns presigned upload URL and S3 key' })
  async getPresignedUploadUrl(@Body() dto: PresignUploadDto) {
    if (!UPLOAD_CONFIG[dto.category]) {
      throw new BadRequestException(
        `Invalid category '${dto.category}'. Valid: ${Object.keys(UPLOAD_CONFIG).join(', ')}`,
      );
    }

    try {
      const result = await this.s3Service.getPresignedUpload(
        dto.category,
        dto.fileName,
        dto.contentType,
        dto.fileSize,
      );
      return result;
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
