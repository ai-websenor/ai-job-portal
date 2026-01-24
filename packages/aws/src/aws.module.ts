import { Module, DynamicModule, Global, InjectionToken, OptionalFactoryDependency } from '@nestjs/common';
import { S3Service } from './s3.service';
import { SesService } from './ses.service';
import { SqsService } from './sqs.service';
import { CognitoService } from './cognito.service';
import { SnsService } from './sns.service';
import { AWS_CONFIG, AwsConfig } from './aws.config';

@Global()
@Module({})
export class AwsModule {
  static forRoot(config: AwsConfig): DynamicModule {
    const providers: any[] = [
      { provide: AWS_CONFIG, useValue: config },
      S3Service,
      SesService,
      SqsService,
      SnsService,
    ];

    // Only register CognitoService if cognito config is provided
    if (config.cognito) {
      providers.push(CognitoService);
    }

    return {
      module: AwsModule,
      providers,
      exports: [S3Service, SesService, SqsService, SnsService, ...(config.cognito ? [CognitoService] : [])],
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
        CognitoService,
        SnsService,
      ],
      exports: [S3Service, SesService, SqsService, CognitoService, SnsService],
    };
  }
}
