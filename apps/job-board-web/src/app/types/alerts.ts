export type AlertType = 'interview_today' | 'low_credits' | 'job_expiring';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionUrl: string;
  actionLabel: string;
  meta?: Record<string, unknown>;
}

export interface AlertListData {
  alerts: Alert[];
  count: number;
}

export interface AlertListResponse {
  data: AlertListData;
  message: string;
  status: string;
  statusCode: number;
}
