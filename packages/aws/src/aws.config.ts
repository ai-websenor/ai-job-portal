export interface AwsConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  s3: {
    bucket: string;
    endpoint?: string;
  };
  ses: {
    fromEmail: string;
    fromName: string;
  };
  sqs: {
    notificationQueueUrl: string;
  };
}

export const AWS_CONFIG = 'AWS_CONFIG';
