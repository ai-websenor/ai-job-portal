"""Reading and writing `resume_analysis`.

The table existed before this feature and had never held a row. It was extended
rather than replaced, so the columns are filled in the spirit they were named:

| Column              | What goes in it                                        |
|---------------------|--------------------------------------------------------|
| `overall_score`     | the score out of 100                                   |
| `ats_score`         | the Skills & Keywords bar, as a percentage             |
| `quality_score`     | the Content Quality bar, as a percentage               |
| `quality_breakdown` | the three bars plus the wording that framed them       |
| `ats_issues`        | ids of the checks about the file rather than the profile |
| `suggestions`       | improvement titles, the plain list the column documents |
| `improvements`      | the full cards, which is what the widget renders        |
| `keyword_matches`   | skills found                                            |
| `missing_keywords`  | skills not found                                        |

A stored row has to rebuild the response on its own, without a second lookup:
re-opening the widget is meant to cost one row read, not a job fetch and a
resume fetch as well. That is why the wording and the target live in
`quality_breakdown` rather than being recomputed - the cached read then returns
exactly what the write produced, which is the behaviour a candidate expects
from a number they were shown a minute ago.
"""

import json
import logging

from app.db import fetch_resume_analysis, upsert_resume_analysis
from app.exceptions import DatabaseError

logger = logging.getLogger(__name__)


def _bucket(result: dict, key: str) -> int:
    for bar in result.get("breakdown") or []:
        if bar.get("key") == key:
            return int(bar.get("score") or 0)
    return 0


def _loads(value, default):
    if value in (None, ""):
        return default
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        logger.warning("Unreadable JSON in resume_analysis; using default")
        return default


def serialize(result: dict, ats_issues: list[str] | None = None) -> dict:
    """Turn a finished response into the columns it is stored as."""
    meta = {
        "band": result.get("band"),
        "headline": result.get("headline"),
        "summary": result.get("summary"),
        "breakdown": result.get("breakdown") or [],
        "target_job": result.get("target_job"),
        "resume": result.get("resume"),
    }
    improvements = result.get("improvements") or []

    return {
        "overall_score": int(result.get("score") or 0),
        "quality_score": _bucket(result, "content"),
        "ats_score": _bucket(result, "skills"),
        "quality_breakdown": json.dumps(meta, ensure_ascii=False),
        "ats_issues": json.dumps(list(ats_issues or []), ensure_ascii=False),
        "suggestions": json.dumps(
            [item.get("title") for item in improvements], ensure_ascii=False
        ),
        "keyword_matches": json.dumps(
            result.get("matched_keywords") or [], ensure_ascii=False
        ),
        "missing_keywords": json.dumps(
            result.get("missing_keywords") or [], ensure_ascii=False
        ),
        "improvements": json.dumps(improvements, ensure_ascii=False),
        "degraded": bool(result.get("degraded")),
    }


def deserialize(row: dict) -> dict:
    """Rebuild the response a stored row was written from."""
    meta = _loads(row.get("quality_breakdown"), {})
    if not isinstance(meta, dict):
        meta = {}

    analyzed_at = row.get("analyzed_at")

    return {
        "status": "ok",
        "score": int(row.get("overall_score") or 0),
        "band": meta.get("band") or "needs_work",
        "headline": meta.get("headline") or "",
        "summary": meta.get("summary") or "",
        "breakdown": meta.get("breakdown") or [],
        "matched_keywords": _loads(row.get("keyword_matches"), []),
        "missing_keywords": _loads(row.get("missing_keywords"), []),
        "improvements": _loads(row.get("improvements"), []),
        "target_job": meta.get("target_job"),
        "resume": meta.get("resume"),
        "generated_at": analyzed_at.isoformat() if hasattr(analyzed_at, "isoformat")
        else str(analyzed_at or ""),
        "degraded": bool(row.get("degraded")),
    }


def save_analysis(resume_id: str | None, user_id: str, job_id: str | None,
                  result: dict, ats_issues: list[str] | None = None) -> bool:
    """Store one analysis. Returns False when it could not be stored.

    `resume_analysis.resume_id` is NOT NULL, so a candidate with no resume on
    file cannot have a row. That is a real state - 264 profiles against 189
    resumes - and it is not an error: they get a live score every time, just
    without the cache. A write failure is swallowed for the same reason, since
    losing the cache is not worth losing the answer over.
    """
    if not resume_id:
        logger.info("No resume on file for %s; score not cached", user_id)
        return False

    try:
        upsert_resume_analysis(
            resume_id=resume_id,
            user_id=user_id,
            job_id=job_id,
            columns=serialize(result, ats_issues),
        )
        return True
    except DatabaseError as e:
        logger.warning("Could not store resume analysis for %s: %s", user_id, e)
        return False


def load_analysis(user_id: str, job_id: str | None = None,
                  max_age_seconds: int | None = None) -> dict | None:
    """The stored response, or None when there is none or it is too old."""
    row = fetch_resume_analysis(user_id, job_id)
    if not row:
        return None

    if max_age_seconds is not None:
        age = row.get("age_seconds")
        if age is None or float(age) > max_age_seconds:
            return None

    return deserialize(row)
