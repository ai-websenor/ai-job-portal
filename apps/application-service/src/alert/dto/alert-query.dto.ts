import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, Min } from 'class-validator';
import { AlertSeverity } from './alert-response.dto';

export const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;
export const SUBSCRIPTION_ALERT_TYPES = ['low_credits', 'job_expiring'] as const;
export const INTERVIEW_ALERT_MODES = ['online', 'on_site', 'phone'] as const;
export const INTERVIEW_ALERT_STATUSES = ['scheduled', 'confirmed', 'rescheduled'] as const;

export type SubscriptionAlertType = (typeof SUBSCRIPTION_ALERT_TYPES)[number];
export type InterviewAlertMode = (typeof INTERVIEW_ALERT_MODES)[number];
export type InterviewAlertStatus = (typeof INTERVIEW_ALERT_STATUSES)[number];

/** Filters shared by every alert endpoint. */
class BaseAlertQueryDto {
  @ApiPropertyOptional({
    description:
      'Max alerts to return (top-N severity-ranked). Omit for the full list ("view all"). `count` is always the filtered total, independent of `limit`.',
    example: 4,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by severity',
    enum: ALERT_SEVERITIES,
  })
  @IsOptional()
  @IsEnum(ALERT_SEVERITIES)
  severity?: AlertSeverity;

  @ApiPropertyOptional({
    description:
      'Keep only alerts dated on/after this ISO 8601 instant. Compared against `meta.scheduledAt` (interviews) or `meta.deadline` (job_expiring); dateless alerts (e.g. low_credits) are excluded when set.',
    example: '2026-06-19T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional({
    description:
      'Keep only alerts dated on/before this ISO 8601 instant. Compared against `meta.scheduledAt` (interviews) or `meta.deadline` (job_expiring); dateless alerts (e.g. low_credits) are excluded when set.',
    example: '2026-06-19T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601()
  toDate?: string;
}

export class InterviewAlertQueryDto extends BaseAlertQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by interview mode',
    enum: INTERVIEW_ALERT_MODES,
  })
  @IsOptional()
  @IsEnum(INTERVIEW_ALERT_MODES)
  mode?: InterviewAlertMode;

  @ApiPropertyOptional({
    description: 'Filter by interview status',
    enum: INTERVIEW_ALERT_STATUSES,
  })
  @IsOptional()
  @IsEnum(INTERVIEW_ALERT_STATUSES)
  status?: InterviewAlertStatus;
}

export class SubscriptionAlertQueryDto extends BaseAlertQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by alert type',
    enum: SUBSCRIPTION_ALERT_TYPES,
  })
  @IsOptional()
  @IsEnum(SUBSCRIPTION_ALERT_TYPES)
  type?: SubscriptionAlertType;
}
