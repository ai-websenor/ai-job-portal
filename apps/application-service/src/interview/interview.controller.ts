import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InterviewService } from './interview.service';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { ScheduleInterviewDto, UpdateInterviewDto } from './dto';

@ApiTags('interviews')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Schedule interview' })
  schedule(@CurrentUser('sub') userId: string, @Body() dto: ScheduleInterviewDto) {
    return this.interviewService.schedule(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get interview details' })
  getById(@Param('id') id: string) {
    return this.interviewService.getById(id);
  }

  @Put(':id')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update interview' })
  update(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: UpdateInterviewDto) {
    return this.interviewService.update(userId, id, dto);
  }

  @Post(':id/cancel')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Cancel interview' })
  cancel(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.interviewService.cancel(userId, id, dto.reason);
  }

  @Post(':id/complete')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Mark interview as complete' })
  complete(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: { rating?: number; notes?: string }) {
    return this.interviewService.complete(userId, id, dto);
  }

  @Get('upcoming/list')
  @ApiOperation({ summary: 'Get upcoming interviews' })
  getUpcoming(@CurrentUser('sub') userId: string, @CurrentUser('role') role: string) {
    return this.interviewService.getUpcoming(userId, role);
  }

  @Post(':id/feedback')
  @Roles('candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Submit candidate feedback' })
  submitFeedback(@CurrentUser('sub') userId: string, @Param('id') id: string, @Body() dto: { feedback: string }) {
    return this.interviewService.submitFeedback(userId, id, dto.feedback);
  }
}
