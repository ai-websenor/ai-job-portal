from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_env: str = "development"
    log_level: str = "INFO"
    aws_profile: str = ""  # empty = use default/IAM role (ECS), set for local dev
    aws_region: str = "ap-south-1"
    s3_bucket: str = "ai-job-portal-dev-uploads"
    s3_resume_prefix: str = "resumes/"
    llm_provider: str = "http"
    llm_base_url: str = "http://qwen-model.ai-job-portal.internal:8000/v1"
    llm_model: str = "Qwen/Qwen2.5-3B-Instruct"
    llm_api_key: str = ""
    sagemaker_endpoint_name: str = "resume-parser-mistral"
    max_file_size_mb: int = 10
    database_url: str = ""
    valkey_url: str = ""  # redis:// or rediss:// URL for Valkey/Redis session store

    # Token estimation & chunking
    llm_context_window: int = 12000
    chunking_enabled: bool = True
    output_token_floor: int = 1000
    output_token_ceiling: int = 4096
    max_resume_pages: int = 10

    # Parse mode: "whole" (single LLM call — default), "raw" (semantic chunks, partial JSON), "chunked" (DEPRECATED legacy section split)
    parse_mode: str = "whole"
    whole_path_max_chars: int = 12000     # threshold — whole-path primary, raw-chunked fallback when exceeded or on failure
    whole_call_timeout_seconds: int = 600 # asyncio wait_for for the single whole-resume call
    whole_max_tokens: int = 8192          # output cap for single-call; rich resumes exceed 4096 → silent truncation
    raw_call_timeout_seconds: int = 600   # asyncio wall-clock per chunk; deep headroom for GPU contention + cold start
    raw_max_pages: int = 15
    raw_chunk_max_chars: int = 1500       # target chunk size in chars
    raw_chunk_min_chars: int = 50         # chunks shorter than this skip LLM call
    raw_chunk_max_tokens: int = 2000      # per-chunk output cap (partial JSON, so less than page mode)

    # Chatbot
    chat_max_tokens: int = 700
    chat_temperature: float = 0.2
    chat_history_turns: int = 8          # user+assistant pairs replayed to the model
    chat_context_ttl_seconds: int = 120  # job/profile lookup cache — chat re-reads them every turn
    chat_job_description_chars: int = 3500
    chat_llm_timeout_seconds: int = 25   # must stay under the gateway/axios read timeout

    # LLM transport timeouts and semaphore wait — tunable via env without redeploy
    llm_read_timeout_seconds: int = 600
    llm_connect_timeout_seconds: int = 10
    llm_semaphore_wait_seconds: int = 600            # parse-pool semaphore acquire timeout
    llm_interactive_semaphore_wait_seconds: int = 30 # chat/interactive pool wait timeout

    # Concurrency control
    max_concurrent_parses: int = 3
    llm_parse_concurrency: int | None = None
    llm_interactive_concurrency: int | None = None
    sagemaker_parse_concurrency: int = 3  # deprecated env fallback
    sagemaker_interactive_concurrency: int = 2  # deprecated env fallback
    per_parse_concurrency: int = 3

    # Salary prediction
    salary_enabled: bool = True
    salary_min_sample: int = 8            # comparables needed before a range is shown at all
    salary_high_confidence_sample: int = 25
    salary_pool_size: int = 400           # comparable rows pulled per ladder step
    salary_cache_ttl_seconds: int = 21600 # 6h — the job pool barely moves within a day
    salary_slider_min: int = 2000         # employer UI bounds; estimates are clamped to them
    salary_slider_max: int = 200000
    salary_llm_timeout_seconds: int = 20

    # Resume scoring
    resume_score_enabled: bool = True
    resume_score_cache_ttl_seconds: int = 900  # 15m — profile edits should show up quickly
    resume_score_llm_timeout_seconds: int = 25
    resume_score_max_suggestions: int = 6

    # DB pool
    db_pool_min: int = 2
    db_pool_max: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
