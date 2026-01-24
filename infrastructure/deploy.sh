#!/bin/bash

# AI Job Portal - CloudFormation Deployment Script
# Usage: ./deploy.sh [dev|staging|prod]

set -e

ENVIRONMENT=${1:-dev}
STACK_NAME="ai-job-portal-${ENVIRONMENT}"
TEMPLATE_FILE="cloudformation.yaml"
AWS_PROFILE="jobportal"
AWS_REGION="ap-south-1"

echo "Deploying ${STACK_NAME} to ${AWS_REGION}..."

# Get VPC and Subnet information
VPC_ID=$(aws ec2 describe-vpcs --profile ${AWS_PROFILE} --region ${AWS_REGION} \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' --output text)

PRIVATE_SUBNETS=$(aws ec2 describe-subnets --profile ${AWS_PROFILE} --region ${AWS_REGION} \
  --filters "Name=vpc-id,Values=${VPC_ID}" \
  --query 'Subnets[*].SubnetId' --output text | tr '\t' ',')

PUBLIC_SUBNETS=${PRIVATE_SUBNETS}  # Using same subnets for dev

# Get RDS Security Group
RDS_SG=$(aws ec2 describe-security-groups --profile ${AWS_PROFILE} --region ${AWS_REGION} \
  --filters "Name=group-name,Values=default" "Name=vpc-id,Values=${VPC_ID}" \
  --query 'SecurityGroups[0].GroupId' --output text)

echo "VPC: ${VPC_ID}"
echo "Subnets: ${PRIVATE_SUBNETS}"
echo "RDS SG: ${RDS_SG}"

# Deploy CloudFormation stack
aws cloudformation deploy \
  --profile ${AWS_PROFILE} \
  --region ${AWS_REGION} \
  --stack-name ${STACK_NAME} \
  --template-file ${TEMPLATE_FILE} \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    Environment=${ENVIRONMENT} \
    VpcId=${VPC_ID} \
    PrivateSubnetIds=${PRIVATE_SUBNETS} \
    PublicSubnetIds=${PUBLIC_SUBNETS} \
    RdsSecurityGroupId=${RDS_SG}

echo "Deployment complete!"

# Get outputs
echo ""
echo "Stack Outputs:"
aws cloudformation describe-stacks \
  --profile ${AWS_PROFILE} \
  --region ${AWS_REGION} \
  --stack-name ${STACK_NAME} \
  --query 'Stacks[0].Outputs' \
  --output table
