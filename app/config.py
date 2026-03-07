from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    aws_profile: str = ""  # empty = use default/IAM role (ECS), set for local dev
    aws_region: str = "ap-south-1"
    s3_bucket: str = "ai-job-portal-dev-uploads"
    s3_resume_prefix: str = "resumes/"
    sagemaker_endpoint_name: str = "resume-parser-mistral"
    max_file_size_mb: int = 10
    database_url: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
