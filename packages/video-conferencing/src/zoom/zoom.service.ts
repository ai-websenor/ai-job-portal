import { Injectable, Inject, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { VIDEO_CONFERENCING_CONFIG, VideoConferencingConfig } from '../video-conferencing.config';
import {
  MeetingCreateRequest,
  MeetingUpdateRequest,
  MeetingDetails,
  MeetingProvider,
} from '../common/meeting.interface';
import { ZoomTokenResponse, ZoomMeetingRequest, ZoomMeetingResponse } from './zoom.types';

@Injectable()
export class ZoomService implements MeetingProvider {
  private readonly logger = new Logger(ZoomService.name);
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private httpClient: AxiosInstance;

  constructor(
    @Inject(VIDEO_CONFERENCING_CONFIG)
    private readonly config: VideoConferencingConfig,
  ) {
    this.baseUrl = this.config.zoom?.baseUrl || 'https://api.zoom.us/v2';
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    if (!this.config.zoom) {
      throw new Error('Zoom configuration not provided');
    }

    const { accountId, clientId, clientSecret } = this.config.zoom;
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const response = await axios.post<ZoomTokenResponse>('https://zoom.us/oauth/token', null, {
        params: {
          grant_type: 'account_credentials',
          account_id: accountId,
        },
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);

      this.logger.log('Zoom access token obtained successfully');
      return this.accessToken;
    } catch (error: any) {
      this.logger.error('Failed to obtain Zoom access token', error.message);
      throw new Error(`Zoom authentication failed: ${error.message}`);
    }
  }

  private generateMockMeeting(request: MeetingCreateRequest): MeetingDetails {
    const mockId = `${Date.now()}`;
    return {
      provider: 'zoom',
      meetingId: mockId,
      meetingLink: `https://zoom.us/j/${mockId}`,
      password: 'mock123',
      hostJoinUrl: `https://zoom.us/s/${mockId}`,
      dialInNumbers: [
        { country: 'US', number: '+1 234 567 8900' },
        { country: 'IN', number: '+91 22 1234 5678' },
      ],
      startTime: request.startTime,
      duration: request.duration,
    };
  }

  async createMeeting(request: MeetingCreateRequest): Promise<MeetingDetails> {
    if (this.config.mockMode) {
      this.logger.log('Creating mock Zoom meeting');
      return this.generateMockMeeting(request);
    }

    const token = await this.getAccessToken();

    const meetingRequest: ZoomMeetingRequest = {
      topic: request.topic,
      type: 2,
      start_time: request.startTime.toISOString(),
      duration: request.duration,
      timezone: request.timezone || 'Asia/Kolkata',
      agenda: request.agenda,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        auto_recording: 'none',
      },
    };

    try {
      const response = await this.httpClient.post<ZoomMeetingResponse>(
        '/users/me/meetings',
        meetingRequest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const meeting = response.data;
      this.logger.log(`Zoom meeting created: ${meeting.id}`);

      return {
        provider: 'zoom',
        meetingId: meeting.id.toString(),
        meetingLink: meeting.join_url,
        password: meeting.password,
        hostJoinUrl: meeting.start_url,
        startTime: new Date(meeting.start_time),
        duration: meeting.duration,
        rawResponse: meeting,
      };
    } catch (error: any) {
      this.logger.error('Failed to create Zoom meeting', error.response?.data || error.message);
      throw new Error(`Failed to create Zoom meeting: ${error.message}`);
    }
  }

  async updateMeeting(meetingId: string, request: MeetingUpdateRequest): Promise<MeetingDetails> {
    if (this.config.mockMode) {
      this.logger.log(`Updating mock Zoom meeting: ${meetingId}`);
      return {
        provider: 'zoom',
        meetingId,
        meetingLink: `https://zoom.us/j/${meetingId}`,
        password: 'mock123',
        hostJoinUrl: `https://zoom.us/s/${meetingId}`,
        startTime: request.startTime || new Date(),
        duration: request.duration || 60,
      };
    }

    const token = await this.getAccessToken();

    const updateRequest: Partial<ZoomMeetingRequest> = {};
    if (request.topic) updateRequest.topic = request.topic;
    if (request.startTime) updateRequest.start_time = request.startTime.toISOString();
    if (request.duration) updateRequest.duration = request.duration;
    if (request.timezone) updateRequest.timezone = request.timezone;
    if (request.agenda) updateRequest.agenda = request.agenda;

    try {
      await this.httpClient.patch(`/meetings/${meetingId}`, updateRequest, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return this.getMeeting(meetingId);
    } catch (error: any) {
      this.logger.error('Failed to update Zoom meeting', error.response?.data || error.message);
      throw new Error(`Failed to update Zoom meeting: ${error.message}`);
    }
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    if (this.config.mockMode) {
      this.logger.log(`Deleting mock Zoom meeting: ${meetingId}`);
      return;
    }

    const token = await this.getAccessToken();

    try {
      await this.httpClient.delete(`/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.logger.log(`Zoom meeting deleted: ${meetingId}`);
    } catch (error: any) {
      this.logger.error('Failed to delete Zoom meeting', error.response?.data || error.message);
      throw new Error(`Failed to delete Zoom meeting: ${error.message}`);
    }
  }

  async getMeeting(meetingId: string): Promise<MeetingDetails> {
    if (this.config.mockMode) {
      this.logger.log(`Getting mock Zoom meeting: ${meetingId}`);
      return {
        provider: 'zoom',
        meetingId,
        meetingLink: `https://zoom.us/j/${meetingId}`,
        password: 'mock123',
        hostJoinUrl: `https://zoom.us/s/${meetingId}`,
        startTime: new Date(),
        duration: 60,
      };
    }

    const token = await this.getAccessToken();

    try {
      const response = await this.httpClient.get<ZoomMeetingResponse>(`/meetings/${meetingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const meeting = response.data;

      return {
        provider: 'zoom',
        meetingId: meeting.id.toString(),
        meetingLink: meeting.join_url,
        password: meeting.password,
        hostJoinUrl: meeting.start_url,
        startTime: new Date(meeting.start_time),
        duration: meeting.duration,
        rawResponse: meeting,
      };
    } catch (error: any) {
      this.logger.error('Failed to get Zoom meeting', error.response?.data || error.message);
      throw new Error(`Failed to get Zoom meeting: ${error.message}`);
    }
  }
}
