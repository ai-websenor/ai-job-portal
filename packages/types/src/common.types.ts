export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
  etag: string;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

export interface SmsPayload {
  to: string;
  message: string;
}

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels: string[];
}
