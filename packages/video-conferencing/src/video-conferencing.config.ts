export interface ZoomConfig {
  accountId: string;
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export interface TeamsConfig {
  tenantId: string;
  appId: string;
  appSecret: string;
  baseUrl?: string;
}

export interface VideoConferencingConfig {
  mockMode?: boolean;
  zoom?: ZoomConfig;
  teams?: TeamsConfig;
}

export const VIDEO_CONFERENCING_CONFIG = 'VIDEO_CONFERENCING_CONFIG';
