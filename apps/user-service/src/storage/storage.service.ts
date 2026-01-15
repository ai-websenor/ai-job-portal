import { Injectable, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import * as mime from 'mime-types';
import { CustomLogger } from '@ai-job-portal/logger';

export interface UploadOptions {
  bucket: string;
  folder?: string;
  filename?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  size: number;
  contentType: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new CustomLogger();
  private s3Client: S3Client;
  private buckets: { profiles: string; resumes: string; documents: string; certificates: string };

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const minioConfig = this.configService.get('minio');

    this.logger.info('Initializing MinIO connection...', 'StorageService');

    this.s3Client = new S3Client({
      endpoint: `http${minioConfig.useSSL ? 's' : ''}://${minioConfig.endpoint}:${minioConfig.port}`,
      region: 'us-east-1', // MinIO doesn't require specific region
      credentials: {
        accessKeyId: minioConfig.accessKey,
        secretAccessKey: minioConfig.secretKey,
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.buckets = minioConfig.buckets;

    // Create buckets if they don't exist
    await this.createBucketsIfNotExist();

    this.logger.success('MinIO connection initialized successfully', 'StorageService');
  }

  private async createBucketsIfNotExist() {
    const bucketNames = Object.values(this.buckets);

    for (const bucketName of bucketNames) {
      try {
        await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        this.logger.info(`Bucket ${bucketName} already exists`, 'StorageService');
      } catch (error: any) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
          try {
            await this.s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
            this.logger.success(`Bucket ${bucketName} created successfully`, 'StorageService');
          } catch (createError) {
            this.logger.error(
              `Failed to create bucket ${bucketName}:`,
              createError as Error,
              'StorageService',
            );
          }
        } else {
          this.logger.error(
            `Error checking bucket ${bucketName}:`,
            error as Error,
            'StorageService',
          );
        }
      }
    }
  }

  /**
   * Upload a file to MinIO
   */
  async uploadFile(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    try {
      const { bucket, folder, filename, contentType, metadata } = options;

      // Generate unique key
      const fileExtension = filename ? filename.split('.').pop() : '';
      const uniqueFilename = filename || `${nanoid()}.${fileExtension}`;
      const key = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: contentType || mime.lookup(uniqueFilename) || 'application/octet-stream',
        Metadata: metadata,
      });

      await this.s3Client.send(command);

      const minioConfig = this.configService.get('minio');
      const url = `http${minioConfig.useSSL ? 's' : ''}://${minioConfig.endpoint}:${minioConfig.port}/${bucket}/${key}`;

      this.logger.success(`File uploaded successfully: ${key}`, 'StorageService');

      return {
        key,
        bucket,
        url,
        size: file.length,
        contentType: contentType || mime.lookup(uniqueFilename) || 'application/octet-stream',
      };
    } catch (error) {
      this.logger.error('Failed to upload file:', error as Error, 'StorageService');
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Get a file from MinIO
   */
  async getFile(bucket: string, key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const stream = response.Body as any;

      return Buffer.from(await stream.transformToByteArray());
    } catch (error) {
      this.logger.error(`Failed to get file ${key}:`, error as Error, 'StorageService');
      throw new InternalServerErrorException('Failed to retrieve file');
    }
  }

  /**
   * Delete a file from MinIO
   */
  async deleteFile(bucket: string, key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.info(`File deleted successfully: ${key}`, 'StorageService');
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error as Error, 'StorageService');
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  /**
   * Generate a pre-signed URL for secure file access
   */
  async getPresignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600, // 1 hour default
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for ${key}:`,
        error as Error,
        'StorageService',
      );
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(
    userId: string,
    file: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    return this.uploadFile(file, {
      bucket: this.buckets.profiles,
      folder: `photos/${userId}`,
      contentType,
      metadata: { userId },
    });
  }

  /**
   * Upload resume
   */
  async uploadResume(
    userId: string,
    file: Buffer,
    filename: string,
    contentType: string,
  ): Promise<UploadResult> {
    return this.uploadFile(file, {
      bucket: this.buckets.resumes,
      folder: userId,
      filename,
      contentType,
      metadata: { userId },
    });
  }

  /**
   * Upload certificate
   */
  async uploadCertificate(
    userId: string,
    file: Buffer,
    filename: string,
    contentType: string,
  ): Promise<UploadResult> {
    return this.uploadFile(file, {
      bucket: this.buckets.certificates,
      folder: userId,
      filename,
      contentType,
      metadata: { userId },
    });
  }

  /**
   * Upload document
   */
  async uploadDocument(
    userId: string,
    file: Buffer,
    filename: string,
    contentType: string,
  ): Promise<UploadResult> {
    return this.uploadFile(file, {
      bucket: this.buckets.documents,
      folder: userId,
      filename,
      contentType,
      metadata: { userId },
    });
  }

  /**
   * Get bucket names
   */
  getBuckets() {
    return this.buckets;
  }
}
