import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { DateRangeDto, ReportPeriodDto, DateRangeWithLimitDto } from './dto';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats() {
    return this.reportsService.getUserStats();
  }

  @Get('users/growth')
  @ApiOperation({ summary: 'Get user growth report' })
  async getUserGrowthReport(@Query() dto: ReportPeriodDto) {
    return this.reportsService.getUserGrowthReport(dto);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get job statistics' })
  async getJobStats() {
    return this.reportsService.getJobStats();
  }

  @Get('jobs/categories')
  @ApiOperation({ summary: 'Get job category statistics' })
  async getJobCategoryStats() {
    return this.reportsService.getJobCategoryStats();
  }

  @Get('jobs/over-time')
  @ApiOperation({ summary: 'Get jobs posted over time' })
  async getJobsOverTime(@Query() dto: ReportPeriodDto) {
    return this.reportsService.getJobsOverTime(dto);
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get application statistics' })
  async getApplicationStats() {
    return this.reportsService.getApplicationStats();
  }

  @Get('applications/over-time')
  @ApiOperation({ summary: 'Get applications over time' })
  async getApplicationsOverTime(@Query() dto: ReportPeriodDto) {
    return this.reportsService.getApplicationsOverTime(dto);
  }

  @Get('interviews')
  @ApiOperation({ summary: 'Get interview statistics' })
  async getInterviewStats(@Query() dto: DateRangeDto) {
    return this.reportsService.getInterviewStats(dto);
  }

  @Get('candidates/analytics')
  @ApiOperation({ summary: 'Get candidate analytics' })
  async getCandidateAnalytics() {
    return this.reportsService.getCandidateAnalytics();
  }

  @Get('employers/analytics')
  @ApiOperation({ summary: 'Get employer analytics' })
  async getEmployerAnalytics(@Query() dto: ReportPeriodDto) {
    return this.reportsService.getEmployerAnalytics(dto);
  }

  @Get('employers/top')
  @ApiOperation({ summary: 'Get top employers' })
  async getTopEmployers(@Query('limit') limit?: number) {
    return this.reportsService.getTopEmployers(limit || 10);
  }

  @Get('hiring-funnel')
  @ApiOperation({ summary: 'Get hiring funnel data' })
  async getHiringFunnel(@Query() dto: DateRangeDto) {
    return this.reportsService.getHiringFunnel(dto);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue statistics' })
  async getRevenueStats() {
    return this.reportsService.getRevenueStats();
  }

  @Get('revenue/report')
  @ApiOperation({ summary: 'Get detailed revenue report' })
  async getRevenueReport(@Query() dto: ReportPeriodDto) {
    return this.reportsService.getRevenueReport(dto);
  }

  @Get('revenue/by-employer')
  @ApiOperation({ summary: 'Get revenue by employer' })
  async getRevenueByEmployer(@Query() dto: DateRangeWithLimitDto) {
    return this.reportsService.getRevenueByEmployer(dto, dto.limit || 10);
  }
}
