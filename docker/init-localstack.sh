#!/bin/bash

echo "Initializing LocalStack resources..."

BUCKET_NAME="ai-job-portal-dev-uploads"

# Create S3 bucket
awslocal s3 mb s3://${BUCKET_NAME} 2>/dev/null || echo "Bucket ${BUCKET_NAME} already exists"
echo "Created S3 bucket: ${BUCKET_NAME}"

# Configure bucket for public read access
echo "Configuring bucket for public read access..."

# Set bucket policy for public read
awslocal s3api put-bucket-policy --bucket ${BUCKET_NAME} --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::'${BUCKET_NAME}'/*"
    }
  ]
}'
echo "Applied public read policy to bucket ${BUCKET_NAME}"

# Disable public access block (allows public access)
awslocal s3api put-public-access-block --bucket ${BUCKET_NAME} --public-access-block-configuration '{
  "BlockPublicAcls": false,
  "IgnorePublicAcls": false,
  "BlockPublicPolicy": false,
  "RestrictPublicBuckets": false
}'
echo "Disabled public access block for bucket ${BUCKET_NAME}"

# Create SQS queues
awslocal sqs create-queue --queue-name ai-job-portal-dev-notifications 2>/dev/null || echo "Queue already exists"
awslocal sqs create-queue --queue-name ai-job-portal-dev-notifications-dlq 2>/dev/null || echo "DLQ already exists"
echo "Created SQS queues"

# Verify SES (in local, all emails are accepted)
awslocal ses verify-email-identity --email-address noreply@aijobportal.com 2>/dev/null || true
echo "Verified SES email identity"

echo "LocalStack initialization complete!"
