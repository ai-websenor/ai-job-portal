import re
import logging
import boto3
from botocore.exceptions import ClientError, NoCredentialsError, BotoCoreError
from app.config import settings
from app.exceptions import ExternalServiceError

logger = logging.getLogger(__name__)

_SAFE_FILENAME = re.compile(r'[^a-zA-Z0-9._\-]')


def get_s3_client():
    kwargs = {"region_name": settings.aws_region}
    if settings.aws_profile:
        kwargs["profile_name"] = settings.aws_profile
    session = boto3.Session(**kwargs)
    return session.client("s3")


def _sanitize_filename(filename: str) -> str:
    """Strip path traversal, replace unsafe chars."""
    name = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    name = _SAFE_FILENAME.sub("_", name)
    if not name or name.startswith("."):
        name = "unnamed_file"
    return name


def download_from_s3(s3_key: str) -> bytes:
    """Download file from S3. Raises ExternalServiceError on failure."""
    try:
        client = get_s3_client()
        response = client.get_object(Bucket=settings.s3_bucket, Key=s3_key)
        return response["Body"].read()
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code in ("NoSuchKey", "404"):
            logger.warning("S3 key not found: %s", s3_key)
            raise ExternalServiceError(f"File not found in storage: {s3_key}") from e
        if code == "AccessDenied":
            logger.error("S3 access denied for key: %s", s3_key)
            raise ExternalServiceError("Storage access denied") from e
        logger.error("S3 download error [%s]: %s", code, e)
        raise ExternalServiceError("Storage download failed") from e
    except (NoCredentialsError, BotoCoreError) as e:
        logger.error("S3 client error: %s", e)
        raise ExternalServiceError("Storage service unavailable") from e


def upload_to_s3(file_bytes: bytes, filename: str) -> str:
    """Upload file to S3 with sanitized filename. Returns S3 key."""
    safe_name = _sanitize_filename(filename)
    s3_key = f"{settings.s3_resume_prefix}{safe_name}"
    try:
        client = get_s3_client()
        client.put_object(Bucket=settings.s3_bucket, Key=s3_key, Body=file_bytes)
        logger.info("Uploaded to S3: %s", s3_key)
        return s3_key
    except (ClientError, NoCredentialsError, BotoCoreError) as e:
        logger.error("S3 upload failed for %s: %s", s3_key, e)
        raise ExternalServiceError("Storage upload failed") from e
