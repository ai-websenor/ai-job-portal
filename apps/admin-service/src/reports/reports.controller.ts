import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportPeriodDto } from './dto';

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

  @Get('applications')
  @ApiOperation({ summary: 'Get application statistics' })
  async getApplicationStats() {
    return this.reportsService.getApplicationStats();
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

  @Get('employers/top')
  @ApiOperation({ summary: 'Get top employers' })
  async getTopEmployers(@Query('limit') limit?: number) {
    return this.reportsService.getTopEmployers(limit || 10);
  }
}
