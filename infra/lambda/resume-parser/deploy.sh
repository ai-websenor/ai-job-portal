#!/bin/bash
# Deploy resume-parser Lambda function with S3 trigger
# Usage: ./deploy.sh [--profile jobportal] [--region ap-south-1]
set -euo pipefail

PROFILE="${AWS_PROFILE:-jobportal}"
REGION="${AWS_REGION:-ap-south-1}"
FUNCTION_NAME="resume-parser"
S3_BUCKET="ai-job-portal-dev-uploads"
SAGEMAKER_ENDPOINT="resume-ner-endpoint"
RUNTIME="python3.12"
HANDLER="handler.handler"
MEMORY=512
TIMEOUT=300  # 5 minutes
LAYER_NAME="resume-parser-deps"

# Database URL (from .env.deploy)
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:xZsb3c91pZrJLmg@ai-job-portal-dev.czemc0204jzt.ap-south-1.rds.amazonaws.com:5432/ai_job_portal_dev?sslmode=require}"

ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --region "$REGION" --query Account --output text)
echo "==> Account: $ACCOUNT_ID | Region: $REGION"

# --- Get VPC config (Lambda needs VPC access for RDS) ---
echo "==> Fetching VPC configuration..."
VPC_ID=$(aws ec2 describe-vpcs --profile "$PROFILE" --region "$REGION" \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' --output text)

SUBNET_IDS=$(aws ec2 describe-subnets --profile "$PROFILE" --region "$REGION" \
  --filters "Name=vpc-id,Values=${VPC_ID}" \
  --query 'Subnets[*].SubnetId' --output text | tr '\t' ',')

# Get default security group (same SG as RDS)
SG_ID=$(aws ec2 describe-security-groups --profile "$PROFILE" --region "$REGION" \
  --filters "Name=group-name,Values=default" "Name=vpc-id,Values=${VPC_ID}" \
  --query 'SecurityGroups[0].GroupId' --output text)

echo "==> VPC: $VPC_ID | Subnets: $SUBNET_IDS | SG: $SG_ID"

# --- IAM Role ---
ROLE_NAME="lambda-resume-parser-role"

if ! aws iam get-role --role-name "$ROLE_NAME" --profile "$PROFILE" --region "$REGION" &>/dev/null; then
  echo "==> Creating IAM role: $ROLE_NAME"
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --profile "$PROFILE" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": { "Service": "lambda.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }]
    }'

  # Basic Lambda execution (CloudWatch logs)
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --profile "$PROFILE" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  # VPC access (ENI creation for RDS connectivity)
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --profile "$PROFILE" \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole

  # Inline policy: S3 read + SageMaker invoke
  aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --profile "$PROFILE" \
    --policy-name "resume-parser-permissions" \
    --policy-document "{
      \"Version\": \"2012-10-17\",
      \"Statement\": [
        {
          \"Effect\": \"Allow\",
          \"Action\": [\"s3:GetObject\"],
          \"Resource\": \"arn:aws:s3:::${S3_BUCKET}/resumes/*\"
        },
        {
          \"Effect\": \"Allow\",
          \"Action\": [\"sagemaker:InvokeEndpoint\"],
          \"Resource\": \"arn:aws:sagemaker:${REGION}:${ACCOUNT_ID}:endpoint/${SAGEMAKER_ENDPOINT}\"
        }
      ]
    }"

  echo "==> Waiting for role propagation..."
  sleep 10
else
  echo "==> IAM role exists: $ROLE_NAME"
fi

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --profile "$PROFILE" --query 'Role.Arn' --output text)

# --- Build Lambda Layer (dependencies) ---
echo "==> Building Lambda layer with dependencies..."
LAYER_DIR=$(mktemp -d)

# Download pre-built Linux x86_64 wheels (no compilation needed)
PIP_CMD=$(command -v pip3 || command -v pip)
echo "==> Downloading manylinux wheels for Lambda (x86_64)..."
$PIP_CMD install -r requirements.txt -t "$LAYER_DIR/python" \
  --platform manylinux2014_x86_64 --only-binary=:all: \
  --python-version 3.12 --implementation cp --no-deps --quiet 2>&1 || true

# Some packages (python-docx) are pure Python — install without platform restriction
$PIP_CMD install python-docx -t "$LAYER_DIR/python" --no-deps --quiet 2>&1 || true

# Install transitive deps that are pure Python
$PIP_CMD install lxml typing_extensions -t "$LAYER_DIR/python" \
  --platform manylinux2014_x86_64 --only-binary=:all: \
  --python-version 3.12 --implementation cp --no-deps --quiet 2>&1 || true

# Package layer
LAYER_ZIP="/tmp/${LAYER_NAME}.zip"
(cd "$LAYER_DIR" && zip -r "$LAYER_ZIP" python -q)
rm -rf "$LAYER_DIR"

echo "==> Publishing Lambda layer: $LAYER_NAME"
LAYER_VERSION_ARN=$(aws lambda publish-layer-version \
  --layer-name "$LAYER_NAME" \
  --profile "$PROFILE" \
  --region "$REGION" \
  --compatible-runtimes "$RUNTIME" \
  --zip-file "fileb://$LAYER_ZIP" \
  --query 'LayerVersionArn' --output text)

echo "==> Layer: $LAYER_VERSION_ARN"
rm -f "$LAYER_ZIP"

# --- Package Lambda function ---
echo "==> Packaging Lambda function..."
FUNC_ZIP="/tmp/${FUNCTION_NAME}.zip"
zip -j "$FUNC_ZIP" handler.py -q

# --- Create or Update Lambda ---
if aws lambda get-function --function-name "$FUNCTION_NAME" --profile "$PROFILE" --region "$REGION" &>/dev/null; then
  echo "==> Updating existing function: $FUNCTION_NAME"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --zip-file "fileb://$FUNC_ZIP" > /dev/null

  # Wait for update to complete
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --profile "$PROFILE" --region "$REGION"

  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --runtime "$RUNTIME" \
    --handler "$HANDLER" \
    --memory-size $MEMORY \
    --timeout $TIMEOUT \
    --layers "$LAYER_VERSION_ARN" \
    --vpc-config "SubnetIds=${SUBNET_IDS},SecurityGroupIds=${SG_ID}" \
    --environment "Variables={DATABASE_URL=${DATABASE_URL},SAGEMAKER_ENDPOINT=${SAGEMAKER_ENDPOINT}}" > /dev/null
else
  echo "==> Creating function: $FUNCTION_NAME"
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --runtime "$RUNTIME" \
    --handler "$HANDLER" \
    --role "$ROLE_ARN" \
    --memory-size $MEMORY \
    --timeout $TIMEOUT \
    --layers "$LAYER_VERSION_ARN" \
    --zip-file "fileb://$FUNC_ZIP" \
    --vpc-config "SubnetIds=${SUBNET_IDS},SecurityGroupIds=${SG_ID}" \
    --environment "Variables={DATABASE_URL=${DATABASE_URL},SAGEMAKER_ENDPOINT=${SAGEMAKER_ENDPOINT}}" > /dev/null

  aws lambda wait function-active --function-name "$FUNCTION_NAME" --profile "$PROFILE" --region "$REGION"
fi

rm -f "$FUNC_ZIP"

LAMBDA_ARN=$(aws lambda get-function --function-name "$FUNCTION_NAME" --profile "$PROFILE" --region "$REGION" --query 'Configuration.FunctionArn' --output text)
echo "==> Lambda ARN: $LAMBDA_ARN"

# --- S3 Event Notification ---
echo "==> Configuring S3 event notification..."

# Grant S3 permission to invoke Lambda
aws lambda add-permission \
  --function-name "$FUNCTION_NAME" \
  --profile "$PROFILE" \
  --region "$REGION" \
  --statement-id "s3-resume-trigger" \
  --action "lambda:InvokeFunction" \
  --principal s3.amazonaws.com \
  --source-arn "arn:aws:s3:::${S3_BUCKET}" \
  --source-account "$ACCOUNT_ID" 2>/dev/null || true

# Set S3 event notification — only for resumes/ prefix, PUT events
# Note: This REPLACES any existing notification config on the bucket.
# If the bucket already has notifications, merge them manually.
aws s3api put-bucket-notification-configuration \
  --bucket "$S3_BUCKET" \
  --profile "$PROFILE" \
  --region "$REGION" \
  --notification-configuration "{
    \"LambdaFunctionConfigurations\": [{
      \"Id\": \"ResumeUploadTrigger\",
      \"LambdaFunctionArn\": \"${LAMBDA_ARN}\",
      \"Events\": [\"s3:ObjectCreated:Put\"],
      \"Filter\": {
        \"Key\": {
          \"FilterRules\": [{
            \"Name\": \"prefix\",
            \"Value\": \"resumes/\"
          }]
        }
      }
    }]
  }"

echo ""
echo "==> Deployment complete!"
echo "    Function: $FUNCTION_NAME"
echo "    Trigger:  s3://${S3_BUCKET}/resumes/* -> Lambda"
echo "    NER:      $SAGEMAKER_ENDPOINT"
echo ""
echo "Test manually:"
echo "  aws lambda invoke --function-name $FUNCTION_NAME \\"
echo "    --profile $PROFILE --region $REGION \\"
echo "    --payload '{\"Records\":[{\"s3\":{\"bucket\":{\"name\":\"${S3_BUCKET}\"},\"object\":{\"key\":\"resumes/test.pdf\"}}}]}' \\"
echo "    /dev/stdout"
