import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AWS_CONFIG, AwsConfig } from './aws.config';

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export interface UploadCategoryConfig {
  folder: string;
  maxSize: number;
  allowedTypes: string[];
}

export const UPLOAD_CONFIG: Record<string, UploadCategoryConfig> = {
  'resume': {
    folder: 'resumes',
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  'video-profile': {
    folder: 'video-profiles',
    maxSize: 225 * 1024 * 1024,
    allowedTypes: ['video/mp4'],
  },
  'profile-photo': {
    folder: 'profile-photos',
    maxSize: 2 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  'company-logo': {
    folder: 'company-logos',
    maxSize: 2 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  'company-banner': {
    folder: 'company-banners',
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  'verification-document': {
    folder: 'company-verification-documents',
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  'avatar': {
    folder: 'avatars',
    maxSize: 2 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  'resume-template-thumbnail': {
    folder: 'resume-template-thumbnails',
    maxSize: 2 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
};

const PUBLIC_PREFIXES = [
  'profile-photos/',
  'avatars/',
  'company-logos/',
  'company-banners/',
  'resume-template-thumbnails/',
];

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private bucketInitialized = false;

  constructor(@Inject(AWS_CONFIG) private readonly config: AwsConfig) {
    this.client = new S3Client({
      region: config.region,
      ...(config.accessKeyId && {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey!,
        },
      }),
      ...(config.s3.endpoint && {
        endpoint: config.s3.endpoint,
        forcePathStyle: true, // Required for LocalStack to use path-style URLs
      }),
    });
    this.bucket = config.s3.bucket;
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  /**
   * Ensures the S3 bucket exists and is configured for public read access.
   * Creates the bucket if it doesn't exist and applies public access policy.
   */
  async ensureBucketExists(): Promise<void> {
    if (this.bucketInitialized) return;

    try {
      // Check if bucket exists
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket ${this.bucket} already exists`);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        this.logger.log(`Creating bucket ${this.bucket}...`);
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket ${this.bucket} created successfully`);
      } else {
        this.logger.warn(`Could not check bucket existence: ${error.message}`);
      }
    }

    // Configure public access for the bucket
    await this.configureBucketPublicAccess();
    this.bucketInitialized = true;
  }

  /**
   * Configures the bucket for public read access.
   * Disables public access blocks and sets a public read policy.
   */
  private async configureBucketPublicAccess(): Promise<void> {
    try {
      // Disable public access block (required for public buckets)
      await this.client.send(
        new PutPublicAccessBlockCommand({
          Bucket: this.bucket,
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            IgnorePublicAcls: false,
            BlockPublicPolicy: false,
            RestrictPublicBuckets: false,
          },
        }),
      );
      this.logger.log(`Public access block disabled for bucket ${this.bucket}`);

      // Set bucket policy — only public prefixes are publicly readable
      const publicReadPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadPublicPrefixes',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: PUBLIC_PREFIXES.map(
              (prefix) => `arn:aws:s3:::${this.bucket}/${prefix}*`,
            ),
          },
        ],
      };

      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify(publicReadPolicy),
        }),
      );
      this.logger.log(`Prefix-scoped public read policy applied to bucket ${this.bucket}`);

      // Configure CORS for direct browser uploads
      await this.configureBucketCors();
    } catch (error: any) {
      this.logger.warn(`Could not configure public access for bucket: ${error.message}`);
    }
  }

  private async configureBucketCors(): Promise<void> {
    try {
      await this.client.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['PUT'],
                AllowedOrigins: [
                  'https://master.d3tubn69g0t2tw.amplifyapp.com',
                  'http://localhost:8080',
                  'http://localhost:3000',
                ],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
      this.logger.log(`CORS configured for bucket ${this.bucket}`);
    } catch (error: any) {
      this.logger.warn(`Could not configure CORS for bucket: ${error.message}`);
    }
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<UploadResult> {
    // Ensure bucket exists before upload
    await this.ensureBucketExists();

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
      // Note: We rely on bucket policy for public access, not per-object ACLs
      // This is the AWS-recommended approach as of 2023
    });

    await this.client.send(command);

    this.logger.log(`Uploaded file: ${key}`);

    return {
      key,
      url: this.getPublicUrl(key),
      bucket: this.bucket,
    };
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getObject(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    return response.Body!;
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
    this.logger.log(`Deleted file: ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns a permanent public URL for the given S3 key.
   * Works for both LocalStack (development) and AWS S3 (production).
   */
  getPublicUrl(key: string): string {
    if (this.config.s3.endpoint) {
      // LocalStack: use path-style URL
      return `${this.config.s3.endpoint}/${this.bucket}/${key}`;
    }
    // AWS S3: use virtual-hosted style URL
    return `https://${this.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  /**
   * Converts an S3 key or URL to a permanent public URL.
   * Handles both old URL format and new key format for backward compatibility.
   * @param keyOrUrl - Either an S3 key (e.g., 'profile-photos/123.jpg') or a full URL
   * @returns Permanent public URL
   */
  getPublicUrlFromKeyOrUrl(keyOrUrl: string | null): string | null {
    if (!keyOrUrl) return null;

    // If it's already a full URL, extract the key and generate fresh public URL
    if (keyOrUrl.startsWith('http')) {
      try {
        const url = new URL(keyOrUrl);
        // Remove leading slash from pathname
        const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        // Remove bucket name if present in path (for path-style URLs)
        const keyWithoutBucket = key.startsWith(this.bucket + '/')
          ? key.slice(this.bucket.length + 1)
          : key;
        return this.getPublicUrl(keyWithoutBucket);
      } catch {
        return keyOrUrl; // Return as-is if URL parsing fails
      }
    }

    // It's a key, generate public URL directly
    return this.getPublicUrl(keyOrUrl);
  }

  /**
   * Extracts the S3 key from a full URL or returns the key as-is.
   */
  extractKeyFromUrl(keyOrUrl: string): string {
    if (keyOrUrl.startsWith('http')) {
      try {
        const url = new URL(keyOrUrl);
        const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        // Remove bucket name if present in path (for path-style URLs)
        return key.startsWith(this.bucket + '/') ? key.slice(this.bucket.length + 1) : key;
      } catch {
        return keyOrUrl;
      }
    }
    return keyOrUrl;
  }

  generateKey(folder: string, filename: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = filename.split('.').pop();
    return `${folder}/${timestamp}-${randomStr}.${ext}`;
  }

  /**
   * Validates upload metadata and returns a presigned PUT URL.
   * Enforces file type and size before generating the URL.
   */
  async getPresignedUpload(
    category: string,
    fileName: string,
    contentType: string,
    fileSize: number,
  ): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
    const config = UPLOAD_CONFIG[category];
    if (!config) {
      throw new Error(`Invalid upload category: ${category}`);
    }
    if (!config.allowedTypes.includes(contentType)) {
      throw new Error(
        `Invalid content type '${contentType}' for category '${category}'. Allowed: ${config.allowedTypes.join(', ')}`,
      );
    }
    if (fileSize > config.maxSize) {
      throw new Error(
        `File size ${fileSize} exceeds max ${config.maxSize} bytes for category '${category}'`,
      );
    }

    const key = this.generateKey(config.folder, fileName);
    const expiresIn = 300; // 5 minutes
    const uploadUrl = await this.getSignedUploadUrl(key, contentType, expiresIn);

    return { uploadUrl, key, expiresIn };
  }

  /**
   * Verifies an uploaded file exists in S3 and is within size limits.
   * Deletes the file if it exceeds the max size.
   */
  async verifyUpload(key: string, maxSizeBytes: number): Promise<{ size: number }> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    const size = response.ContentLength || 0;

    if (size > maxSizeBytes) {
      await this.delete(key);
      throw new Error(`Uploaded file (${size} bytes) exceeds max size (${maxSizeBytes} bytes)`);
    }

    return { size };
  }

  /**
   * Returns the appropriate URL for a key:
   * - Public URL for public prefixes (profile photos, avatars, logos, etc.)
   * - Presigned download URL for private prefixes (resumes, videos, verification docs)
   */
  async getUrlForKey(key: string, expiresIn = 3600): Promise<string> {
    if (this.isPublicPrefix(key)) {
      return this.getPublicUrl(key);
    }
    return this.getSignedDownloadUrl(key, expiresIn);
  }

  isPublicPrefix(key: string): boolean {
    return PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix));
  }
}
