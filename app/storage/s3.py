import boto3
from app.config import settings


def get_s3_client():
    session = boto3.Session(profile_name=settings.aws_profile, region_name=settings.aws_region)
    return session.client("s3")


def download_from_s3(s3_key: str) -> bytes:
    """Download file from S3 and return bytes."""
    client = get_s3_client()
    response = client.get_object(Bucket=settings.s3_bucket, Key=s3_key)
    return response["Body"].read()


def upload_to_s3(file_bytes: bytes, filename: str) -> str:
    """Upload file to S3 resumes/ prefix. Returns the S3 key."""
    client = get_s3_client()
    s3_key = f"{settings.s3_resume_prefix}{filename}"
    client.put_object(Bucket=settings.s3_bucket, Key=s3_key, Body=file_bytes)
    return s3_key
