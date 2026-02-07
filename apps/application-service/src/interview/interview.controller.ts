import { Controller, Get, Post, Put, Body, Param, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InterviewService } from './interview.service';
import { CurrentUser, Roles, RolesGuard, PaginationDto } from '@ai-job-portal/common';
import {
  ScheduleInterviewDto,
  UpdateInterviewDto,
  InterviewResponseDto,
  SCHEDULE_INTERVIEW_EXAMPLES,
} from './dto';

@ApiTags('interviews')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Schedule interview',
    description: `Schedule a new interview for a job application.

**Interview Types:**
- \`phone\` - Phone screening
- \`video\` - Video interview
- \`in_person\` - Face-to-face at office
- \`technical\` - Technical/coding round
- \`hr\` - HR discussion
- \`panel\` - Multiple interviewers
- \`assessment\` - Skills test

**Interview Modes:**
- \`online\` - Virtual interview via video call
- \`offline\` - In-person at physical location

**Interview Tools (for online):**
- \`zoom\` - Auto-generates Zoom meeting link
- \`teams\` - Auto-generates Microsoft Teams meeting link
- \`phone\` - Phone call only
- \`other\` - Provide your own meeting link

**Date Format:** ISO 8601 (e.g., \`2026-02-15T10:30:00.000Z\`)`,
  })
  @ApiBody({
    type: ScheduleInterviewDto,
    examples: SCHEDULE_INTERVIEW_EXAMPLES,
  })
  @ApiResponse({
    status: 201,
    description: 'Interview scheduled successfully',
    type: InterviewResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input - check date format and enum values' })
  @ApiResponse({ status: 403, description: 'Employer profile required' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  schedule(@CurrentUser('sub') userId: string, @Body() dto: ScheduleInterviewDto) {
    return this.interviewService.schedule(userId, dto);
  }

  @Get('upcoming/list')
  @ApiOperation({
    summary: 'Get upcoming interviews',
    description:
      'Get list of upcoming scheduled interviews. Returns different data based on user role (employer/candidate).',
  })
  @ApiResponse({ status: 200, description: 'List of upcoming interviews' })
  getUpcoming(
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: PaginationDto,
  ) {
    return this.interviewService.getUpcoming(userId, role, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get interview details',
    description:
      'Get detailed information about a specific interview including application and job details.',
  })
  @ApiParam({
    name: 'id',
    description: 'Interview UUID',
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @ApiResponse({ status: 200, description: 'Interview details', type: InterviewResponseDto })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  getById(@Param('id') id: string) {
    return this.interviewService.getById(id);
  }

  @Put(':id')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Update/Reschedule interview',
    description: 'Update interview details or reschedule to a different time.',
  })
  @ApiParam({
    name: 'id',
    description: 'Interview UUID',
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @ApiBody({
    type: UpdateInterviewDto,
    examples: {
      reschedule: {
        summary: 'Reschedule to new time',
        value: {
          scheduledAt: '2026-02-20T14:00:00.000Z',
          status: 'rescheduled',
        },
      },
      updateDetails: {
        summary: 'Update interview details',
        value: {
          duration: 90,
          interviewTool: 'teams',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Interview updated', type: InterviewResponseDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviewService.update(userId, id, dto);
  }

  @Post(':id/cancel')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Cancel interview',
    description:
      'Cancel a scheduled interview. If a Zoom/Teams meeting was auto-generated, it will also be deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Interview UUID',
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Optional reason for cancellation',
          example: 'Position filled by another candidate',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Interview canceled' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  cancel(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: { reason?: string },
  ) {
    return this.interviewService.cancel(userId, id, dto.reason);
  }

  @Post(':id/complete')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Mark interview as complete',
    description: 'Mark an interview as completed with optional notes.',
  })
  @ApiParam({
    name: 'id',
    description: 'Interview UUID',
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rating: {
          type: 'number',
          description: 'Overall rating (1-5)',
          example: 4,
          minimum: 1,
          maximum: 5,
        },
        notes: {
          type: 'string',
          description: 'Interviewer notes',
          example: 'Strong technical skills, good communication. Recommend for next round.',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Interview marked as complete' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  complete(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: { rating?: number; notes?: string },
  ) {
    return this.interviewService.complete(userId, id, dto);
  }

  @Post(':id/feedback')
  @Roles('employer')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Add interviewer feedback',
    description: 'Add detailed feedback and ratings for the interview.',
  })
  @ApiParam({
    name: 'id',
    description: 'Interview UUID',
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['rating'],
      properties: {
        rating: {
          type: 'number',
          description: 'Overall rating (1-5)',
          example: 4,
          minimum: 1,
          maximum: 5,
        },
        technicalSkills: {
          type: 'number',
          description: 'Technical skills rating (1-5)',
          example: 5,
        },
        communication: {
          type: 'number',
          description: 'Communication skills rating (1-5)',
          example: 4,
        },
        cultureFit: {
          type: 'number',
          description: 'Culture fit rating (1-5)',
          example: 4,
        },
        notes: {
          type: 'string',
          description: 'Detailed feedback notes',
          example: 'Excellent problem-solving skills. Strong in React and Node.js.',
        },
        recommendation: {
          type: 'string',
          enum: ['strong_hire', 'hire', 'no_hire', 'strong_no_hire'],
          description: 'Hiring recommendation',
          example: 'hire',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Feedback added' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  addInterviewerFeedback(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body()
    dto: {
      rating: number;
      technicalSkills?: number;
      communication?: number;
      cultureFit?: number;
      notes?: string;
      recommendation?: string;
    },
  ) {
    return this.interviewService.addInterviewerFeedback(userId, id, dto);
  }

  @Post(':id/candidate-feedback')
  @Roles('candidate')
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Submit candidate feedback',
    description: 'Allow candidate to submit their feedback about the interview experience.',
  })
  @ApiParam({
    name: 'id',
    description: 'Interview UUID',
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['feedback'],
      properties: {
        feedback: {
          type: 'string',
          description: 'Candidate feedback about the interview',
          example:
            'The interview was well-organized. The technical questions were relevant to the role.',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Feedback submitted' })
  @ApiResponse({ status: 403, description: 'Access denied - not your interview' })
  submitFeedback(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: { feedback: string },
  ) {
    return this.interviewService.submitFeedback(userId, id, dto.feedback);
  }
}
