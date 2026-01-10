import { Controller, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { StatusService } from './status.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApplicationIdParamDto } from '../common/dto/uuid-param.dto';

@ApiTags('status')
@Controller('applications')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Patch(':applicationId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update application status' })
  @ApiParam({
    name: 'applicationId',
    description: 'UUID of the application',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Application status updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID or validation error.',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found.',
  })
  updateStatus(
    @Param() params: ApplicationIdParamDto,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req,
  ) {
    return this.statusService.updateStatus(params.applicationId, updateStatusDto, req.user);
  }
}
