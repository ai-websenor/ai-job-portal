"""In-memory job store for tracking async parse jobs."""

import threading
import time
import uuid
from dataclasses import dataclass, field


@dataclass
class ParseJob:
    job_id: str
    status: str
    logs: list = field(default_factory=list)
    # chunks_done/chunks_total stay None until the parser reports real numbers.
    # A concrete 0 means "the parser found 0 sections" — clients treat that as
    # "not a resume", so it must never be published speculatively.
    progress: dict = field(default_factory=lambda: {
        "current_step": 0,
        "total_steps": 0,
        "chunks_done": None,
        "chunks_total": None,
    })
    result: dict | None = None
    error: str | None = None
    created_at: float = field(default_factory=time.time)


_jobs: dict[str, ParseJob] = {}
_lock = threading.Lock()


def create_job() -> str:
    """Create a new parse job with status='queued'. Returns job_id."""
    job_id = str(uuid.uuid4())
    job = ParseJob(job_id=job_id, status="queued")
    with _lock:
        _jobs[job_id] = job
    return job_id


def get_job(job_id: str) -> ParseJob | None:
    """Return the ParseJob for the given id, or None."""
    with _lock:
        return _jobs.get(job_id)


def add_log(job_id: str, message: str, level: str = "info") -> None:
    """Append a timestamped log entry to the job."""
    entry = {
        "time": time.strftime("%H:%M:%S"),
        "message": message,
        "level": level,
    }
    with _lock:
        job = _jobs.get(job_id)
        if job:
            job.logs.append(entry)


def update_status(
    job_id: str,
    status: str,
    current_step: int = None,
    total_steps: int = None,
    chunks_done: int = None,
    chunks_total: int = None,
) -> None:
    """Update job status and optionally progress fields."""
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return
        job.status = status
        if current_step is not None:
            job.progress["current_step"] = current_step
        if total_steps is not None:
            job.progress["total_steps"] = total_steps
        if chunks_done is not None:
            job.progress["chunks_done"] = chunks_done
        if chunks_total is not None:
            job.progress["chunks_total"] = chunks_total


def set_result(job_id: str, result: dict) -> None:
    """Set the final result and mark job as done."""
    with _lock:
        job = _jobs.get(job_id)
        if job:
            job.result = result
            job.status = "done"


def set_error(job_id: str, error_msg: str) -> None:
    """Set the error message and mark job as error."""
    with _lock:
        job = _jobs.get(job_id)
        if job:
            job.error = error_msg
            job.status = "error"


def cleanup_old_jobs(max_age_seconds: int = 1800) -> None:
    """Remove jobs older than max_age_seconds (default 30 min)."""
    cutoff = time.time() - max_age_seconds
    with _lock:
        expired = [jid for jid, job in _jobs.items() if job.created_at < cutoff]
        for jid in expired:
            del _jobs[jid]


def to_dict(job_id: str) -> dict | None:
    """Return the job as a plain dict for API responses, or None."""
    with _lock:
        job = _jobs.get(job_id)
        if not job:
            return None
        return {
            "job_id": job.job_id,
            "status": job.status,
            "logs": list(job.logs),
            "progress": dict(job.progress),
            "result": job.result,
            "error": job.error,
            "created_at": job.created_at,
        }
