#!/bin/bash

echo "Initializing LocalStack resources..."

# Create S3 bucket
awslocal s3 mb s3://ai-job-portal-dev-uploads
echo "Created S3 bucket: ai-job-portal-dev-uploads"

# Create SQS queues
awslocal sqs create-queue --queue-name ai-job-portal-dev-notifications
awslocal sqs create-queue --queue-name ai-job-portal-dev-notifications-dlq
echo "Created SQS queues"

# Verify SES (in local, all emails are accepted)
awslocal ses verify-email-identity --email-address noreply@aijobportal.com
echo "Verified SES email identity"

echo "LocalStack initialization complete!"
