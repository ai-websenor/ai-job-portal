import {
  Module,
  DynamicModule,
  Global,
  InjectionToken,
  OptionalFactoryDependency,
} from '@nestjs/common';
import { PlacesService } from './places.service';
import { GOOGLE_CONFIG, GoogleConfig } from './google.config';

@Global()
@Module({})
export class GoogleModule {
  static forRoot(config: GoogleConfig): DynamicModule {
    return {
      module: GoogleModule,
      providers: [{ provide: GOOGLE_CONFIG, useValue: config }, PlacesService],
      exports: [PlacesService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => GoogleConfig | Promise<GoogleConfig>;
    inject?: (InjectionToken | OptionalFactoryDependency)[];
  }): DynamicModule {
    return {
      module: GoogleModule,
      providers: [
        {
          provide: GOOGLE_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        PlacesService,
      ],
      exports: [PlacesService],
    };
  }
}
