import { Controller, Post, Patch, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InterviewService } from './interview.service';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('interviews')
@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Schedule an interview for an application' })
  @ApiResponse({
    status: 201,
    description: 'Interview scheduled successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found.',
  })
  scheduleInterview(@Body() scheduleInterviewDto: ScheduleInterviewDto) {
    return this.interviewService.scheduleInterview(scheduleInterviewDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an interview' })
  @ApiResponse({
    status: 200,
    description: 'Interview updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Interview not found.',
  })
  updateInterview(@Param('id') id: string, @Body() updateInterviewDto: UpdateInterviewDto) {
    return this.interviewService.updateInterview(id, updateInterviewDto);
  }

  @Get('application/:applicationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all interviews for an application' })
  @ApiResponse({
    status: 200,
    description: 'Interviews retrieved successfully.',
  })
  getInterviewsByApplication(@Param('applicationId') applicationId: string) {
    return this.interviewService.getInterviewsByApplication(applicationId);
  }
}
