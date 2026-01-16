import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { InterviewService } from './interview.service.js';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto.js';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard.js';
import { RolesGuard } from 'src/common/guards/roles.guard.js';
import { Roles, UserRole } from '@ai-job-portal/common';
// Assuming AuthGuard exists in common or similar.
// I will assume standard request has user object attached by global guard or I need to import one.
// The user prompt didn't specify strict AuthGuard implementation details, but standard 'Employer only' role implies it.
// I will check imports from other controllers if possible, but for now I'll use a placeholder or assume global auth adds user to request.

@Controller('api/v1/interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  @Roles(UserRole.EMPLOYER)
  async scheduleInterview(@Req() req: any, @Body() dto: ScheduleInterviewDto) {
    return this.interviewService.scheduleInterview(req.user.id, dto);
  }

  @Get()
  async getInterviews(@Req() req: any) {
    const { id: userId, role } = req.user;

    return this.interviewService.getInterviews(userId, role);
  }
}
