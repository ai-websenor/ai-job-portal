#!/bin/bash
# Deploy HuggingFace NER model to SageMaker Serverless Inference
# Usage: ./deploy-model.sh [--profile jobportal] [--region ap-south-1]
set -euo pipefail

PROFILE="${AWS_PROFILE:-jobportal}"
REGION="${AWS_REGION:-ap-south-1}"
MODEL_NAME="resume-ner-parser"
ENDPOINT_NAME="resume-ner-endpoint"
ENDPOINT_CONFIG_NAME="resume-ner-config"

# HuggingFace model — dslim/bert-base-NER is a strong general NER model.
# For production, consider fine-tuning on resume data.
HF_MODEL_ID="dslim/bert-base-NER"
HF_TASK="token-classification"

# HuggingFace DLC (Deep Learning Container) image for inference
# See: https://github.com/aws/deep-learning-containers/blob/master/available_images.md
ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --region "$REGION" --query Account --output text)
IMAGE_URI="763104351884.dkr.ecr.${REGION}.amazonaws.com/huggingface-pytorch-inference:2.1.0-transformers4.37.0-cpu-py310-ubuntu22.04"

echo "==> Account: $ACCOUNT_ID | Region: $REGION | Profile: $PROFILE"

# --- IAM Role ---
ROLE_NAME="sagemaker-resume-ner-role"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

# Check if role exists
if ! aws iam get-role --role-name "$ROLE_NAME" --profile "$PROFILE" --region "$REGION" &>/dev/null; then
  echo "==> Creating IAM role: $ROLE_NAME"
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": { "Service": "sagemaker.amazonaws.com" },
        "Action": "sts:AssumeRole"
      }]
    }'

  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --policy-arn arn:aws:iam::aws:policy/AmazonSageMakerFullAccess

  # ECR pull permissions for HuggingFace DLC image
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --profile "$PROFILE" \
    --region "$REGION" \
    --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

  echo "==> Waiting for role propagation..."
  sleep 10
else
  echo "==> IAM role exists: $ROLE_NAME"
fi

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --profile "$PROFILE" --region "$REGION" --query 'Role.Arn' --output text)
echo "==> Role ARN: $ROLE_ARN"

# --- Delete existing endpoint (if updating) ---
if aws sagemaker describe-endpoint --endpoint-name "$ENDPOINT_NAME" --profile "$PROFILE" --region "$REGION" &>/dev/null; then
  echo "==> Deleting existing endpoint: $ENDPOINT_NAME"
  aws sagemaker delete-endpoint --endpoint-name "$ENDPOINT_NAME" --profile "$PROFILE" --region "$REGION"
  echo "==> Waiting for endpoint deletion..."
  aws sagemaker wait endpoint-deleted --endpoint-name "$ENDPOINT_NAME" --profile "$PROFILE" --region "$REGION" 2>/dev/null || sleep 30
fi

# Delete existing endpoint config
if aws sagemaker describe-endpoint-config --endpoint-config-name "$ENDPOINT_CONFIG_NAME" --profile "$PROFILE" --region "$REGION" &>/dev/null; then
  aws sagemaker delete-endpoint-config --endpoint-config-name "$ENDPOINT_CONFIG_NAME" --profile "$PROFILE" --region "$REGION"
fi

# Delete existing model
if aws sagemaker describe-model --model-name "$MODEL_NAME" --profile "$PROFILE" --region "$REGION" &>/dev/null; then
  aws sagemaker delete-model --model-name "$MODEL_NAME" --profile "$PROFILE" --region "$REGION"
fi

# --- Create SageMaker Model ---
echo "==> Creating SageMaker model: $MODEL_NAME"
aws sagemaker create-model \
  --model-name "$MODEL_NAME" \
  --profile "$PROFILE" \
  --region "$REGION" \
  --primary-container "{
    \"Image\": \"$IMAGE_URI\",
    \"Environment\": {
      \"HF_MODEL_ID\": \"$HF_MODEL_ID\",
      \"HF_TASK\": \"$HF_TASK\",
      \"SAGEMAKER_CONTAINER_LOG_LEVEL\": \"20\"
    }
  }" \
  --execution-role-arn "$ROLE_ARN"

# --- Create Serverless Endpoint Config ---
echo "==> Creating serverless endpoint config: $ENDPOINT_CONFIG_NAME"
aws sagemaker create-endpoint-config \
  --endpoint-config-name "$ENDPOINT_CONFIG_NAME" \
  --profile "$PROFILE" \
  --region "$REGION" \
  --production-variants "[{
    \"VariantName\": \"AllTraffic\",
    \"ModelName\": \"$MODEL_NAME\",
    \"ServerlessConfig\": {
      \"MemorySizeInMB\": 4096,
      \"MaxConcurrency\": 5
    }
  }]"

# --- Create Endpoint ---
echo "==> Creating endpoint: $ENDPOINT_NAME (this may take 3-5 minutes)..."
aws sagemaker create-endpoint \
  --endpoint-name "$ENDPOINT_NAME" \
  --endpoint-config-name "$ENDPOINT_CONFIG_NAME" \
  --profile "$PROFILE" \
  --region "$REGION"

echo "==> Waiting for endpoint to become InService..."
aws sagemaker wait endpoint-in-service \
  --endpoint-name "$ENDPOINT_NAME" \
  --profile "$PROFILE" \
  --region "$REGION"

echo "==> Endpoint ready: $ENDPOINT_NAME"
echo ""
echo "Test with:"
echo "  aws sagemaker-runtime invoke-endpoint \\"
echo "    --endpoint-name $ENDPOINT_NAME \\"
echo "    --content-type application/json \\"
echo "    --body '{\"inputs\": \"John Doe is a Software Engineer at Google with 5 years of Python experience.\"}' \\"
echo "    --profile $PROFILE --region $REGION \\"
echo "    /dev/stdout"
