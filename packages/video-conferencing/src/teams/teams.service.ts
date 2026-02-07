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
    if (this.config.mockMode) {
      this.logger.log('Creating mock Teams meeting');
      return this.generateMockMeeting(request);
    }

    const token = await this.getAccessToken();

    const endTime = new Date(request.startTime.getTime() + request.duration * 60 * 1000);

    const meetingRequest: TeamsMeetingRequest = {
      startDateTime: request.startTime.toISOString(),
      endDateTime: endTime.toISOString(),
      subject: request.topic,
      lobbyBypassSettings: {
        scope: 'organization',
        isDialInBypassEnabled: true,
      },
    };

    try {
      const response = await this.httpClient.post<TeamsMeetingResponse>(
        '/me/onlineMeetings',
        meetingRequest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const meeting = response.data;
      this.logger.log(`Teams meeting created: ${meeting.id}`);

      const dialInNumbers: { country: string; number: string }[] = [];
      if (meeting.audioConferencing) {
        if (meeting.audioConferencing.tollNumber) {
          dialInNumbers.push({
            country: 'Toll',
            number: meeting.audioConferencing.tollNumber,
          });
        }
        if (meeting.audioConferencing.tollFreeNumber) {
          dialInNumbers.push({
            country: 'Toll-Free',
            number: meeting.audioConferencing.tollFreeNumber,
          });
        }
      }

      return {
        provider: 'teams',
        meetingId: meeting.id,
        meetingLink: meeting.joinWebUrl,
        hostJoinUrl: meeting.joinWebUrl,
        dialInNumbers,
        startTime: new Date(meeting.startDateTime),
        duration: request.duration,
        rawResponse: meeting,
      };
    } catch (error: any) {
      this.logger.error('Failed to create Teams meeting', error.response?.data || error.message);
      throw new Error(`Failed to create Teams meeting: ${error.message}`);
    }
  }

  async updateMeeting(meetingId: string, request: MeetingUpdateRequest): Promise<MeetingDetails> {
    if (this.config.mockMode) {
      this.logger.log(`Updating mock Teams meeting: ${meetingId}`);
      return {
        provider: 'teams',
        meetingId,
        meetingLink: `https://teams.microsoft.com/l/meetup-join/${meetingId}`,
        hostJoinUrl: `https://teams.microsoft.com/l/meetup-join/${meetingId}`,
        startTime: request.startTime || new Date(),
        duration: request.duration || 60,
      };
    }

    const token = await this.getAccessToken();

    const updateRequest: Partial<TeamsMeetingRequest> = {};
    if (request.topic) updateRequest.subject = request.topic;
    if (request.startTime) {
      updateRequest.startDateTime = request.startTime.toISOString();
      const duration = request.duration || 60;
      const endTime = new Date(request.startTime.getTime() + duration * 60 * 1000);
      updateRequest.endDateTime = endTime.toISOString();
    }

    try {
      await this.httpClient.patch(`/me/onlineMeetings/${meetingId}`, updateRequest, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return this.getMeeting(meetingId);
    } catch (error: any) {
      this.logger.error('Failed to update Teams meeting', error.response?.data || error.message);
      throw new Error(`Failed to update Teams meeting: ${error.message}`);
    }
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    if (this.config.mockMode) {
      this.logger.log(`Deleting mock Teams meeting: ${meetingId}`);
      return;
    }

    const token = await this.getAccessToken();

    try {
      await this.httpClient.delete(`/me/onlineMeetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.logger.log(`Teams meeting deleted: ${meetingId}`);
    } catch (error: any) {
      this.logger.error('Failed to delete Teams meeting', error.response?.data || error.message);
      throw new Error(`Failed to delete Teams meeting: ${error.message}`);
    }
  }

  async getMeeting(meetingId: string): Promise<MeetingDetails> {
    if (this.config.mockMode) {
      this.logger.log(`Getting mock Teams meeting: ${meetingId}`);
      return {
        provider: 'teams',
        meetingId,
        meetingLink: `https://teams.microsoft.com/l/meetup-join/${meetingId}`,
        hostJoinUrl: `https://teams.microsoft.com/l/meetup-join/${meetingId}`,
        startTime: new Date(),
        duration: 60,
      };
    }

    const token = await this.getAccessToken();

    try {
      const response = await this.httpClient.get<TeamsMeetingResponse>(
        `/me/onlineMeetings/${meetingId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const meeting = response.data;
      const startTime = new Date(meeting.startDateTime);
      const endTime = new Date(meeting.endDateTime);
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      const dialInNumbers: { country: string; number: string }[] = [];
      if (meeting.audioConferencing) {
        if (meeting.audioConferencing.tollNumber) {
          dialInNumbers.push({
            country: 'Toll',
            number: meeting.audioConferencing.tollNumber,
          });
        }
      }

      return {
        provider: 'teams',
        meetingId: meeting.id,
        meetingLink: meeting.joinWebUrl,
        hostJoinUrl: meeting.joinWebUrl,
        dialInNumbers,
        startTime,
        duration,
        rawResponse: meeting,
      };
    } catch (error: any) {
      this.logger.error('Failed to get Teams meeting', error.response?.data || error.message);
      throw new Error(`Failed to get Teams meeting: ${error.message}`);
    }
  }
}
