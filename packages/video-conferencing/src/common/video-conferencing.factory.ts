import { Injectable, Optional, Logger } from '@nestjs/common';
import { ZoomService } from '../zoom/zoom.service';
import { TeamsService } from '../teams/teams.service';
import { MeetingProvider } from './meeting.interface';

export type VideoConferencingTool = 'zoom' | 'teams';

@Injectable()
export class VideoConferencingFactory {
  private readonly logger = new Logger(VideoConferencingFactory.name);

  constructor(
    @Optional() private readonly zoomService?: ZoomService,
    @Optional() private readonly teamsService?: TeamsService,
  ) {}

  getProvider(tool: VideoConferencingTool): MeetingProvider {
    switch (tool) {
      case 'zoom':
        if (!this.zoomService) {
          this.logger.error('Zoom service not configured');
          throw new Error('Zoom is not configured. Please provide Zoom credentials.');
        }
        return this.zoomService;

      case 'teams':
        if (!this.teamsService) {
          this.logger.error('Teams service not configured');
          throw new Error('Teams is not configured. Please provide Teams credentials.');
        }
        return this.teamsService;

      default:
        throw new Error(`Unknown video conferencing tool: ${tool}`);
    }
  }

  isProviderAvailable(tool: VideoConferencingTool): boolean {
    switch (tool) {
      case 'zoom':
        return !!this.zoomService;
      case 'teams':
        return !!this.teamsService;
      default:
        return false;
    }
  }

  getAvailableProviders(): VideoConferencingTool[] {
    const providers: VideoConferencingTool[] = [];
    if (this.zoomService) providers.push('zoom');
    if (this.teamsService) providers.push('teams');
    return providers;
  }
}
