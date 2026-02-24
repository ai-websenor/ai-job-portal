import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { AWS_CONFIG, AwsConfig } from './aws.config';

export interface QueueMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
  correlationId?: string;
}

@Injectable()
export class SqsService {
  private readonly logger = new Logger(SqsService.name);
  private readonly client: SQSClient;
  private readonly notificationQueueUrl: string;

  constructor(@Inject(AWS_CONFIG) private readonly config: AwsConfig) {
    this.client = new SQSClient({
      region: config.region,
      ...(config.accessKeyId && {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey!,
        },
      }),
      // Use endpoint for LocalStack or custom SQS endpoints
      ...((config.sqs.endpoint || config.endpoint) && {
        endpoint: config.sqs.endpoint || config.endpoint,
      }),
    });
    this.notificationQueueUrl = config.sqs.notificationQueueUrl;

    // Debug logging
    this.logger.log(`🔧 SQS Service initialized`);
    this.logger.log(`📍 Queue URL: ${this.notificationQueueUrl || 'NOT SET'}`);
    this.logger.log(`🌍 Region: ${config.region}`);
    this.logger.log(`🔑 Credentials: ${config.accessKeyId ? 'CONFIGURED' : 'NOT SET'}`);
  }

  async sendMessage<T>(
    queueUrl: string,
    message: QueueMessage<T>,
    delaySeconds?: number,
  ): Promise<string> {
    try {
      this.logger.log(`📤 Sending message type: ${message.type} to queue: ${queueUrl}`);

      if (!queueUrl) {
        throw new Error(
          'Queue URL is not configured. Check SQS_NOTIFICATION_QUEUE_URL environment variable.',
        );
      }

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message),
        ...(delaySeconds && { DelaySeconds: delaySeconds }),
      });

      const result = await this.client.send(command);

      this.logger.log(`✅ Message sent: ${result.MessageId} to ${queueUrl}`);

      return result.MessageId!;
    } catch (error: any) {
      this.logger.error(`❌ SQS sendMessage failed:`, error);
      this.logger.error(`Error details - Name: ${error?.name}, Message: ${error?.message}`);
      this.logger.error(`Full error object:`, JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async sendNotification<T>(type: string, payload: T, correlationId?: string): Promise<string> {
    const message: QueueMessage<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    return this.sendMessage(this.notificationQueueUrl, message);
  }

  async receiveMessages(
    queueUrl: string,
    maxMessages: number = 10,
    waitTimeSeconds: number = 20,
  ): Promise<Message[]> {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds,
      AttributeNames: ['All'],
      MessageAttributeNames: ['All'],
    });

    const result = await this.client.send(command);

    return result.Messages || [];
  }

  async deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.client.send(command);

    this.logger.log(`Message deleted from ${queueUrl}`);
  }

  parseMessage<T>(message: Message): QueueMessage<T> | null {
    if (!message.Body) {
      return null;
    }

    try {
      return JSON.parse(message.Body) as QueueMessage<T>;
    } catch {
      this.logger.error(`Failed to parse message: ${message.MessageId}`);
      return null;
    }
  }

  // Notification-specific helpers
  async sendApplicationNotification(payload: {
    userId: string;
    applicationId: string;
    jobTitle: string;
    status: string;
  }): Promise<string> {
    return this.sendNotification('APPLICATION_STATUS_CHANGED', payload);
  }

  async sendInterviewNotification(payload: {
    userId: string;
    interviewId: string;
    jobTitle: string;
    scheduledAt: string;
    type: string;
    meetingLink?: string;
    meetingPassword?: string;
    interviewTool?: string;
  }): Promise<string> {
    return this.sendNotification('INTERVIEW_SCHEDULED', payload);
  }

  async sendNewApplicationNotification(payload: {
    employerId: string;
    applicationId: string;
    jobTitle: string;
    candidateName: string;
  }): Promise<string> {
    return this.sendNotification('NEW_APPLICATION', payload);
  }

  async sendEmployerInterviewNotification(payload: {
    employerId: string;
    employerEmail: string;
    interviewId: string;
    jobTitle: string;
    companyName: string;
    candidateName: string;
    candidateEmail: string;
    scheduledAt: string;
    duration: number;
    type: string;
    interviewMode?: string;
    interviewTool?: string;
    meetingLink?: string;
    meetingPassword?: string;
    hostJoinUrl?: string;
    location?: string;
    timezone?: string;
  }): Promise<string> {
    return this.sendNotification('EMPLOYER_INTERVIEW_SCHEDULED', payload);
  }

  async sendInterviewRescheduledNotification(payload: {
    userId: string;
    interviewId: string;
    jobTitle: string;
    companyName: string;
    oldScheduledAt: string;
    newScheduledAt: string;
    duration: number;
    type: string;
    meetingLink?: string;
    meetingPassword?: string;
    interviewTool?: string;
    reason?: string;
  }): Promise<string> {
    return this.sendNotification('INTERVIEW_RESCHEDULED', payload);
  }

  async sendEmployerInterviewRescheduledNotification(payload: {
    employerId: string;
    employerEmail: string;
    interviewId: string;
    jobTitle: string;
    candidateName: string;
    oldScheduledAt: string;
    newScheduledAt: string;
    duration: number;
    type: string;
    meetingLink?: string;
    hostJoinUrl?: string;
    meetingPassword?: string;
    interviewTool?: string;
    reason?: string;
  }): Promise<string> {
    return this.sendNotification('EMPLOYER_INTERVIEW_RESCHEDULED', payload);
  }

  async sendInterviewCanceledNotification(payload: {
    userId: string;
    interviewId: string;
    jobTitle: string;
    companyName: string;
    scheduledAt: string;
    type: string;
    reason?: string;
  }): Promise<string> {
    return this.sendNotification('INTERVIEW_CANCELLED', payload);
  }

  async sendEmployerInterviewCanceledNotification(payload: {
    employerId: string;
    employerEmail: string;
    interviewId: string;
    jobTitle: string;
    candidateName: string;
    scheduledAt: string;
    type: string;
    reason?: string;
  }): Promise<string> {
    return this.sendNotification('EMPLOYER_INTERVIEW_CANCELLED', payload);
  }

  async sendWelcomeNotification(payload: {
    userId: string;
    email: string;
    firstName: string;
    role: string;
  }): Promise<string> {
    return this.sendNotification('WELCOME_EMAIL', payload);
  }

  async sendVerificationEmailNotification(payload: {
    userId: string;
    email: string;
    otp: string;
  }): Promise<string> {
    return this.sendNotification('VERIFICATION_EMAIL', payload);
  }

  async sendPasswordChangedNotification(payload: {
    userId: string;
    email: string;
    firstName: string;
  }): Promise<string> {
    return this.sendNotification('PASSWORD_CHANGED', payload);
  }

  async sendApplicationReceivedCandidateNotification(payload: {
    userId: string;
    email: string;
    candidateName: string;
    applicationId: string;
    jobTitle: string;
    companyName: string;
  }): Promise<string> {
    return this.sendNotification('APPLICATION_RECEIVED_CANDIDATE', payload);
  }

  async sendApplicationWithdrawnNotification(payload: {
    employerId: string;
    applicationId: string;
    jobTitle: string;
    candidateName: string;
  }): Promise<string> {
    return this.sendNotification('APPLICATION_WITHDRAWN', payload);
  }

  async sendOfferExtendedNotification(payload: {
    userId: string;
    applicationId: string;
    jobTitle: string;
    companyName: string;
    salary?: string;
    joiningDate?: string;
  }): Promise<string> {
    return this.sendNotification('OFFER_EXTENDED', payload);
  }

  async sendOfferAcceptedNotification(payload: {
    employerId: string;
    applicationId: string;
    jobTitle: string;
    candidateName: string;
  }): Promise<string> {
    return this.sendNotification('OFFER_ACCEPTED', payload);
  }

  async sendOfferDeclinedNotification(payload: {
    employerId: string;
    applicationId: string;
    jobTitle: string;
    candidateName: string;
    reason?: string;
  }): Promise<string> {
    return this.sendNotification('OFFER_DECLINED', payload);
  }

  async sendOfferWithdrawnNotification(payload: {
    userId: string;
    applicationId: string;
    jobTitle: string;
    companyName: string;
  }): Promise<string> {
    return this.sendNotification('OFFER_WITHDRAWN', payload);
  }

  async sendNewMessageNotification(payload: {
    recipientId: string;
    senderId: string;
    senderName: string;
    threadId: string;
    messagePreview: string;
  }): Promise<string> {
    return this.sendNotification('NEW_MESSAGE', payload);
  }

  async sendJobPostedNotification(payload: {
    employerId: string;
    jobId: string;
    jobTitle: string;
  }): Promise<string> {
    return this.sendNotification('JOB_POSTED', payload);
  }
}
