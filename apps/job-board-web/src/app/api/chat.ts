import ENDPOINTS from './endpoints';
import http from './http';
import type { IChatMessage, IChatRoom } from '../types/types';

export interface CreateThreadRequest {
  recipientId: string;
  body: string;
  applicationId?: string;
  jobId?: string;
}

export interface CreateThreadResponse {
  message: string;
  data: {
    thread: IChatRoom;
    message: IChatMessage;
    isNew: boolean;
  };
}

type ConversationTarget = {
  userId: string;
};

type ApplicationContext = {
  applicationId: string;
};

type JobContext = {
  id: string;
};

export const startConversation = async (opts: {
  recipient: ConversationTarget;
  application?: ApplicationContext | null;
  job?: JobContext | null;
  body: string;
}) => {
  const recipientId = opts.recipient.userId?.trim();
  const body = opts.body.trim();

  if (!recipientId) {
    throw new Error('Recipient user ID is required to start a conversation.');
  }

  if (!body) {
    throw new Error('Message body is required to start a conversation.');
  }

  const payload: CreateThreadRequest = {
    recipientId,
    body,
  };

  if (opts.application) {
    const applicationId = opts.application.applicationId?.trim();

    if (!applicationId) {
      throw new Error('Application context is missing an application ID.');
    }

    payload.applicationId = applicationId;
  } else if (opts.job?.id?.trim()) {
    payload.jobId = opts.job.id.trim();
  }

  return http.post<any, CreateThreadResponse>(ENDPOINTS.MESSAGES.THREADS.CREATE, payload);
};
