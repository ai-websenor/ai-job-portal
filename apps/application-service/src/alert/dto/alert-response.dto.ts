import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type AlertType = 'interview_today' | 'low_credits' | 'job_expiring';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export class AlertDto {
  @ApiProperty({
    description: 'Stable unique id for the alert (prefixed by type)',
    example: 'interview_today-550e8400-e29b-41d4-a716-446655440099',
  })
  id: string;

  @ApiProperty({
    description: 'Alert category, drives the card rendering on the frontend',
    enum: ['interview_today', 'low_credits', 'job_expiring'],
    example: 'interview_today',
  })
  type: AlertType;

  @ApiProperty({
    description: 'Visual severity, drives the card color',
    enum: ['info', 'warning', 'critical'],
    example: 'info',
  })
  severity: AlertSeverity;

  @ApiProperty({ description: 'Short headline', example: 'Interview today at 3:00 PM' })
  title: string;

  @ApiProperty({
    description: 'Supporting line',
    example: 'Technical round with Acme Corp',
  })
  message: string;

  @ApiProperty({
    description: 'Relative URL the card links to',
    example: '/interviews/550e8400-e29b-41d4-a716-446655440099',
  })
  actionUrl: string;

  @ApiProperty({ description: 'Call-to-action label', example: 'View interview' })
  actionLabel: string;

  @ApiPropertyOptional({
    description: 'Type-specific extra data for the frontend',
    type: 'object',
    additionalProperties: true,
    example: { scheduledAt: '2026-06-15T09:30:00.000Z', interviewMode: 'online' },
  })
  meta?: Record<string, unknown>;
}

export class AlertListResponseDto {
  @ApiProperty({ type: [AlertDto] })
  alerts: AlertDto[];

  @ApiProperty({
    description:
      'Total number of available alerts (before any `limit` slice), so the frontend can decide whether to show a "view all" affordance',
    example: 3,
  })
  count: number;
}
