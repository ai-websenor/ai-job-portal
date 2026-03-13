from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    aws_profile: str = ""  # empty = use default/IAM role (ECS), set for local dev
    aws_region: str = "ap-south-1"
    s3_bucket: str = "ai-job-portal-dev-uploads"
    s3_resume_prefix: str = "resumes/"
    sagemaker_endpoint_name: str = "resume-parser-mistral"
    max_file_size_mb: int = 10
    database_url: str = ""
    valkey_url: str = ""  # redis:// or rediss:// URL for Valkey/Redis session store

    # Token estimation & chunking
    llm_context_window: int = 32768
    chunking_enabled: bool = True
    output_token_floor: int = 4000
    output_token_ceiling: int = 16000
    max_resume_pages: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
