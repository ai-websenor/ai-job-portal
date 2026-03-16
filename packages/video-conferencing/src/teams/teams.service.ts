/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Inject, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { VIDEO_CONFERENCING_CONFIG, VideoConferencingConfig } from '../video-conferencing.config';
import {
  MeetingCreateRequest,
  MeetingUpdateRequest,
  MeetingDetails,
  MeetingProvider,
} from '../common/meeting.interface';
import { AzureTokenResponse, TeamsMeetingRequest, TeamsMeetingResponse } from './teams.types';

@Injectable()
export class TeamsService implements MeetingProvider {
  private readonly logger = new Logger(TeamsService.name);
  private readonly graphBaseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private httpClient: AxiosInstance;

  constructor(
    @Inject(VIDEO_CONFERENCING_CONFIG)
    private readonly config: VideoConferencingConfig,
  ) {
    this.graphBaseUrl = this.config.teams?.baseUrl || 'https://graph.microsoft.com/v1.0';
    this.httpClient = axios.create({
      baseURL: this.graphBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    if (!this.config.teams) {
      throw new Error('Teams configuration not provided');
    }

    const { tenantId, appId, appSecret } = this.config.teams;

    try {
      const response = await axios.post<AzureTokenResponse>(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);

      this.logger.log('Teams access token obtained successfully');
      return this.accessToken;
    } catch (error: any) {
      this.logger.error('Failed to obtain Teams access token', error.message);
      throw new Error(`Teams authentication failed: ${error.message}`);
    }
  }

  private generateMockMeeting(request: MeetingCreateRequest): MeetingDetails {
    const mockId = `mock-teams-${Date.now()}`;
    return {
      provider: 'teams',
      meetingId: mockId,
      meetingLink: `https://teams.microsoft.com/l/meetup-join/${mockId}`,
      hostJoinUrl: `https://teams.microsoft.com/l/meetup-join/${mockId}`,
      dialInNumbers: [
        { country: 'US', number: '+1 234 567 8901' },
        { country: 'IN', number: '+91 22 1234 5679' },
      ],
      startTime: request.startTime,
      duration: request.duration,
    };
  }

  async createMeeting(request: MeetingCreateRequest): Promise<MeetingDetails> {
    // Teams integration is temporary — always generate random meeting links
    // Will be replaced with Microsoft Teams API integration later
    this.logger.log('Generating temporary Teams meeting link');
    return this.generateMockMeeting(request);
  }

  async updateMeeting(meetingId: string, request: MeetingUpdateRequest): Promise<MeetingDetails> {
    // Teams integration is temporary — return updated mock details
    this.logger.log(`Updating temporary Teams meeting: ${meetingId}`);
    return {
      provider: 'teams',
      meetingId,
      meetingLink: `https://teams.microsoft.com/l/meetup-join/${meetingId}`,
      hostJoinUrl: `https://teams.microsoft.com/l/meetup-join/${meetingId}`,
      startTime: request.startTime || new Date(),
      duration: request.duration || 60,
    };
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    // Teams integration is temporary — no real meeting to delete
    this.logger.log(`Deleting temporary Teams meeting: ${meetingId}`);
  }

  async getMeeting(meetingId: string): Promise<MeetingDetails> {
    // Teams integration is temporary — return mock details
    this.logger.log(`Getting temporary Teams meeting: ${meetingId}`);
    return {
      provider: 'teams',
      meetingId,
      meetingLink: `https://teams.microsoft.com/l/meetup-join/${meetingId}`,
      hostJoinUrl: `https://teams.microsoft.com/l/meetup-join/${meetingId}`,
      startTime: new Date(),
      duration: 60,
    };
  }
}
