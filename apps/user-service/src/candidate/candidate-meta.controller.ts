import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { CandidateMetaService } from './candidate-meta.service';
import { CandidateMetaResponseDto } from './dto/candidate-meta.response.dto';

@ApiTags('Candidate Meta')
@Controller('candidates/me/meta')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CandidateMetaController {
  private readonly logger = new Logger(CandidateMetaController.name);

  constructor(private readonly candidateMetaService: CandidateMetaService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all candidate meta data',
    description: 'Returns all stored candidate meta data from normalized tables. Read-only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Candidate meta data retrieved successfully',
    type: CandidateMetaResponseDto,
  })
  async getMeta(
    @GetUser('id') userId: string,
  ): Promise<{ data: CandidateMetaResponseDto; message: string }> {
    this.logger.log(`Fetching meta data for user ${userId}`);
    const result = await this.candidateMetaService.getMeta(userId);
    return { data: result, message: 'Candidate meta data retrieved successfully' };
  }
}
