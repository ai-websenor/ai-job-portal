import { Module, DynamicModule, Global, InjectionToken, OptionalFactoryDependency } from '@nestjs/common';
import { S3Service } from './s3.service';
import { SesService } from './ses.service';
import { SqsService } from './sqs.service';
import { AWS_CONFIG, AwsConfig } from './aws.config';

@Global()
@Module({})
export class AwsModule {
  static forRoot(config: AwsConfig): DynamicModule {
    return {
      module: AwsModule,
      providers: [
        {
          provide: AWS_CONFIG,
          useValue: config,
        },
        S3Service,
        SesService,
        SqsService,
      ],
      exports: [S3Service, SesService, SqsService],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => AwsConfig | Promise<AwsConfig>;
    inject?: (InjectionToken | OptionalFactoryDependency)[];
  }): DynamicModule {
    return {
      module: AwsModule,
      providers: [
        {
          provide: AWS_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        S3Service,
        SesService,
        SqsService,
      ],
      exports: [S3Service, SesService, SqsService],
    };
  }
}
