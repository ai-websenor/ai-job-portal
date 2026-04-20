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

    # Parse mode: "whole" (single LLM call — default), "raw" (semantic chunks, partial JSON), "chunked" (DEPRECATED legacy section split)
    parse_mode: str = "whole"
    whole_path_max_chars: int = 15000     # threshold — whole-path primary, raw-chunked fallback when exceeded or on failure
    whole_call_timeout_seconds: int = 600 # asyncio wait_for for the single whole-resume call
    whole_max_tokens: int = 16000         # output cap for single-call; == output_token_ceiling
    raw_call_timeout_seconds: int = 600   # asyncio wall-clock per chunk; deep headroom for GPU contention + cold start
    raw_max_pages: int = 15
    raw_chunk_max_chars: int = 1500       # target chunk size in chars
    raw_chunk_min_chars: int = 50         # chunks shorter than this skip LLM call
    raw_chunk_max_tokens: int = 2000      # per-chunk output cap (partial JSON, so less than page mode)

    # LLM transport timeouts (boto3 + semaphore wait) — all tunable via env without redeploy
    llm_read_timeout_seconds: int = 600              # boto3 read_timeout (max idle between stream chunks)
    llm_connect_timeout_seconds: int = 10            # boto3 connect_timeout
    llm_semaphore_wait_seconds: int = 600            # parse-pool semaphore acquire timeout
    llm_interactive_semaphore_wait_seconds: int = 30 # chat/interactive pool wait timeout

    # Concurrency control
    max_concurrent_parses: int = 3
    sagemaker_parse_concurrency: int = 3
    sagemaker_interactive_concurrency: int = 2
    per_parse_concurrency: int = 3

    # DB pool
    db_pool_min: int = 2
    db_pool_max: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
