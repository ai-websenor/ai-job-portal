import { Injectable, Logger, OnModuleInit, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import * as mime from 'mime-types';

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
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private buckets: { profiles: string; resumes: string; documents: string; certificates: string };

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const minioConfig = this.configService.get('minio');

    this.logger.log('Initializing MinIO connection...');

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

    this.logger.log('MinIO connection initialized successfully');
  }

  private async createBucketsIfNotExist() {
    const bucketNames = Object.values(this.buckets);

    for (const bucketName of bucketNames) {
      try {
        await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        this.logger.log(`Bucket ${bucketName} already exists`);
      } catch (error: any) {
        if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
          try {
            await this.s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
            this.logger.log(`Bucket ${bucketName} created successfully`);
          } catch (createError) {
            this.logger.error(`Failed to create bucket ${bucketName}:`, createError);
          }
        } else {
          this.logger.error(`Error checking bucket ${bucketName}:`, error);
        }
      }
    }
  }

  /**
   * Upload a file to MinIO
   */
  async uploadFile(
    file: Buffer,
    options: UploadOptions,
  ): Promise<UploadResult> {
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

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        bucket,
        url,
        size: file.length,
        contentType: contentType || mime.lookup(uniqueFilename) || 'application/octet-stream',
      };
    } catch (error) {
      this.logger.error('Failed to upload file:', error);
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
      this.logger.error(`Failed to get file ${key}:`, error);
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
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}:`, error);
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
      this.logger.error(`Failed to generate presigned URL for ${key}:`, error);
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(userId: string, file: Buffer, contentType: string): Promise<UploadResult> {
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
  async uploadResume(userId: string, file: Buffer, filename: string, contentType: string): Promise<UploadResult> {
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
  async uploadCertificate(userId: string, file: Buffer, filename: string, contentType: string): Promise<UploadResult> {
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
  async uploadDocument(userId: string, file: Buffer, filename: string, contentType: string): Promise<UploadResult> {
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
