import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { SalaryService } from './salary.service';
import { SalaryEstimateDto } from './dto/salary-estimate.dto';

/**
 * HTTP surface for salary estimation.
 *
 * Shares the `jobs` prefix with `JobController`, so the public path through
 * the gateway is `POST /api/v1/jobs/salary-estimate`.
 */
@ApiTags('jobs')
@Controller('jobs')
export class SalaryController {
  constructor(private readonly salaryService: SalaryService) {}

  @Post('salary-estimate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('employer', 'super_employer')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Estimate the market salary range for a job being posted',
    description:
      'Prices a half-filled job form against live priced job adverts. Returns ' +
      'status "insufficientData" with no figures when the comparables are too ' +
      'few or too scattered to stand behind. All figures are in the requested ' +
      'payRate (default monthly) and INR.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estimate, or an honest "insufficientData" with no figures.',
  })
  async estimate(@CurrentUser('sub') userId: string, @Body() dto: SalaryEstimateDto) {
    const data = await this.salaryService.estimate(dto, userId);
    return {
      message:
        data.status === 'ok'
          ? 'Salary estimate generated successfully'
          : 'Not enough comparable jobs for a salary estimate',
      data,
    };
  }
}
