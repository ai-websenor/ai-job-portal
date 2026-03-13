import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { RolesGuard, Roles } from '@ai-job-portal/common';
import { EmailSettingsService } from './email-settings.service';
import { UpdateEmailSettingsDto } from './dto';

@ApiTags('Admin - Email Settings')
@ApiBearerAuth()
@Controller('admin/email-settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
export class EmailSettingsController {
  constructor(private readonly emailSettingsService: EmailSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get global email settings' })
  @ApiResponse({ status: 200, description: 'Email settings fetched successfully' })
  async get() {
    const settings = await this.emailSettingsService.get();
    return { message: 'Email settings fetched successfully', data: settings };
  }

  @Put()
  @ApiOperation({ summary: 'Update global email settings' })
  @ApiResponse({ status: 200, description: 'Email settings updated successfully' })
  async update(@Body() dto: UpdateEmailSettingsDto) {
    const settings = await this.emailSettingsService.update(dto);
    return { message: 'Email settings updated successfully', data: settings };
  }

  @Post('logo')
  @ApiOperation({
    summary: 'Upload email logo image (JPEG/PNG/WebP, max 2MB, recommended 320x80px, 4:1 ratio)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  async uploadLogo(@Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }
    return this.emailSettingsService.uploadLogo(data);
  }
}
