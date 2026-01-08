import { Controller, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StatusService } from './status.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('status')
@Controller('applications')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Patch(':applicationId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update application status' })
  @ApiResponse({
    status: 200,
    description: 'Application status updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found.',
  })
  updateStatus(
    @Param('applicationId') applicationId: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req,
  ) {
    return this.statusService.updateStatus(applicationId, updateStatusDto, req.user);
  }
}
