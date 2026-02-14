export interface AwsConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string; // LocalStack endpoint
  s3: {
    bucket: string;
    endpoint?: string;
  };
  ses: {
    fromEmail: string;
    fromName: string;
    endpoint?: string;
  };
  sqs: {
    notificationQueueUrl: string;
    endpoint?: string;
  };
  cognito?: {
    userPoolId: string;
    clientId: string;
    clientSecret?: string;
    domain: string;
  };
  sns?: {
    smsTopicArn?: string;
    smsSenderId?: string;
    endpoint?: string;
  };
}

export const AWS_CONFIG = 'AWS_CONFIG';
