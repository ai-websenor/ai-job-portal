import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { EmployerCandidateService } from './employer-candidate.service';
import { EmployerCandidateResponseDto } from './dto/employer-candidate-response.dto';

@Controller('employers/candidates')
@ApiTags('Employer Candidates')
@ApiBearerAuth()
export class EmployerCandidateController {
  constructor(private readonly employerCandidateService: EmployerCandidateService) {}

  @Get(':candidateId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'View full candidate profile (Employer Only)',
    description:
      'Employer can view complete candidate profile only if the candidate has applied to at least one of their jobs. Returns profile, resume, skills, experience, education, and job preferences. Role validation is handled in the service layer.',
  })
  @ApiParam({
    name: 'candidateId',
    description: 'UUID of the candidate (job seeker)',
    example: 'a486ab43-5fc3-4c80-8905-d66565fc4c68',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate profile retrieved successfully',
    type: EmployerCandidateResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Either not an employer or no access to this candidate',
  })
  @ApiResponse({
    status: 404,
    description: 'Candidate not found',
  })
  async getCandidateProfile(@Param('candidateId') candidateId: string, @Request() req) {
    return this.employerCandidateService.getCandidateProfileForEmployer(candidateId, req.user);
  }
}
