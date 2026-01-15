import { Controller, Post, Patch, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InterviewService } from './interview.service';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { InterviewIdParamDto, ApplicationIdParamDto } from '../common/dto/uuid-param.dto';

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
  @ApiParam({
    name: 'id',
    description: 'UUID of the interview',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Interview updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID or validation error.',
  })
  @ApiResponse({
    status: 404,
    description: 'Interview not found.',
  })
  updateInterview(
    @Param() params: InterviewIdParamDto,
    @Body() updateInterviewDto: UpdateInterviewDto,
  ) {
    return this.interviewService.updateInterview(params.id, updateInterviewDto);
  }

  @Get('application/:applicationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all interviews for an application' })
  @ApiParam({
    name: 'applicationId',
    description: 'UUID of the application',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Interviews retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID.',
  })
  getInterviewsByApplication(@Param() params: ApplicationIdParamDto) {
    return this.interviewService.getInterviewsByApplication(params.applicationId);
  }
}
