import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { ListAuditLogsDto } from './dto';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs with filters' })
  async listAuditLogs(@Query() dto: ListAuditLogsDto) {
    return this.auditService.listAuditLogs(dto);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent activity' })
  async getRecentActivity(@Query('limit') limit?: number) {
    return this.auditService.getRecentActivity(limit || 20);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get action summary' })
  async getActionSummary() {
    return this.auditService.getActionSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log details' })
  async getAuditLog(@Param('id') id: string) {
    return this.auditService.getAuditLog(id);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get entity audit history' })
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(entityType, entityId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user activity' })
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getUserActivity(userId, limit || 100);
  }
}
