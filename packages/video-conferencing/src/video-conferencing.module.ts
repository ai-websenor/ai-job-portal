import {
  Module,
  DynamicModule,
  Global,
  InjectionToken,
  OptionalFactoryDependency,
  Provider,
} from '@nestjs/common';
import { ZoomService } from './zoom/zoom.service';
import { TeamsService } from './teams/teams.service';
import { VideoConferencingFactory } from './common/video-conferencing.factory';
import { VIDEO_CONFERENCING_CONFIG, VideoConferencingConfig } from './video-conferencing.config';

@Global()
@Module({})
export class VideoConferencingModule {
  static forRoot(config: VideoConferencingConfig): DynamicModule {
    const providers: Provider[] = [
      { provide: VIDEO_CONFERENCING_CONFIG, useValue: config },
      VideoConferencingFactory,
    ];

    const exports: any[] = [VideoConferencingFactory];

    if (config.zoom || config.mockMode) {
      providers.push(ZoomService);
      exports.push(ZoomService);
    }

    if (config.teams || config.mockMode) {
      providers.push(TeamsService);
      exports.push(TeamsService);
    }

    return {
      module: VideoConferencingModule,
      providers,
      exports,
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => VideoConferencingConfig | Promise<VideoConferencingConfig>;
    inject?: (InjectionToken | OptionalFactoryDependency)[];
  }): DynamicModule {
    return {
      module: VideoConferencingModule,
      providers: [
        {
          provide: VIDEO_CONFERENCING_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        ZoomService,
        TeamsService,
        VideoConferencingFactory,
      ],
      exports: [ZoomService, TeamsService, VideoConferencingFactory],
    };
  }
}
