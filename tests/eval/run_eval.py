"""Eval runner: parses every resume that has a ground truth file, scores the
result, and writes a report.

Two modes:
- Live (default): calls the real LLM endpoint (settings.llm_base_url). Requires
  network access to the qwen-model EC2 host — only works from inside the VPC
  or through a tunnel. Raw LLM responses are cached to tests/eval/cache/ so
  re-running after a merge/prompt-only change doesn't need to re-hit the GPU.
- Cached (--no-live): replays cached raw responses only; fails loudly for any
  resume with no cache entry instead of silently skipping it.

Usage:
    python -m tests.eval.run_eval                  # live, uses cache when fresh
    python -m tests.eval.run_eval --refresh         # ignore cache, re-call LLM
    python -m tests.eval.run_eval --no-live         # cache-only, no GPU calls
    python -m tests.eval.run_eval --only jgobhi      # substring filter on stem
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

EVAL_DIR = Path(__file__).parent
GROUND_TRUTH_DIR = EVAL_DIR / "ground_truth"
CACHE_DIR = EVAL_DIR / "cache"
PARSED_DIR = EVAL_DIR / "parsed_output"
TEST_DOCS_DIR = EVAL_DIR.parent.parent / "docs" / "test-docs"

sys.path.insert(0, str(EVAL_DIR.parent.parent))

from app.extractors.pdf import extract_pages_from_pdf  # noqa: E402
from app.exceptions import ExtractionError, ExternalServiceError  # noqa: E402
from app.parser.chunk_prompts import build_raw_whole_prompt  # noqa: E402
from app.parser.chunked_processor import (  # noqa: E402
    _parse_chunk_json,
    apply_deterministic_overrides,
    merge_page_results,
)
from app.parser.llm import invoke_llm  # noqa: E402
from app.config import settings  # noqa: E402


def _prompt_hash(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:16]


def _find_resume_file(stem: str) -> Path | None:
    for ext in (".pdf",):
        candidate = TEST_DOCS_DIR / f"{stem}{ext}"
        if candidate.exists():
            return candidate
    return None


def _get_raw_llm_response(stem: str, prompt: str, live: bool, refresh: bool) -> str | None:
    cache_path = CACHE_DIR / f"{stem}.{_prompt_hash(prompt)}.raw.txt"

    if cache_path.exists() and not refresh:
        return cache_path.read_text(encoding="utf-8")

    if not live:
        # Fall back to ANY cached response for this stem (prompt changed but
        # we still want a same-stem regression signal) — flag it clearly.
        stale = sorted(CACHE_DIR.glob(f"{stem}.*.raw.txt"))
        if stale:
            print(f"  [cache] using STALE cache for {stem} (prompt hash changed)", file=sys.stderr)
            return stale[-1].read_text(encoding="utf-8")
        print(f"  [cache] MISS for {stem} — no cached response, --no-live can't proceed", file=sys.stderr)
        return None

    try:
        raw = invoke_llm(prompt, settings.whole_max_tokens, 0.1)
    except ExternalServiceError as e:
        print(f"  [llm] call failed for {stem}: {e}", file=sys.stderr)
        return None

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(raw, encoding="utf-8")
    return raw


def run_one(stem: str, live: bool, refresh: bool) -> bool:
    pdf_path = _find_resume_file(stem)
    if pdf_path is None:
        print(f"  SKIP {stem}: no matching PDF in {TEST_DOCS_DIR}", file=sys.stderr)
        return False

    try:
        with open(pdf_path, "rb") as f:
            file_bytes = f.read()
        pages, _ = extract_pages_from_pdf(file_bytes)
    except ExtractionError as e:
        print(f"  SKIP {stem}: extraction failed: {e}", file=sys.stderr)
        return False

    text = "\n\n".join(p for p in pages if p).strip()
    prompt = build_raw_whole_prompt(text)

    raw = _get_raw_llm_response(stem, prompt, live, refresh)
    if raw is None:
        return False

    parsed = _parse_chunk_json(raw, stem)
    if parsed is None:
        print(f"  FAIL {stem}: LLM response was not parseable JSON", file=sys.stderr)
        return False

    output = merge_page_results([parsed])
    output = apply_deterministic_overrides(output, text)

    PARSED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PARSED_DIR / f"{stem}.json"
    out_path.write_text(json.dumps(output.model_dump(), indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  OK {stem} -> {out_path}")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", default=True, help="call the real LLM (default)")
    parser.add_argument("--no-live", dest="live", action="store_false", help="cache-only, no GPU calls")
    parser.add_argument("--refresh", action="store_true", help="ignore cache, force fresh LLM calls")
    parser.add_argument("--only", default=None, help="substring filter on resume stem")
    parser.add_argument("--report", default=str(EVAL_DIR / "eval-report.md"))
    args = parser.parse_args()

    stems = sorted(p.stem for p in GROUND_TRUTH_DIR.glob("*.json"))
    if args.only:
        stems = [s for s in stems if args.only.lower() in s.lower()]

    if not stems:
        print("No ground truth files matched.", file=sys.stderr)
        sys.exit(1)

    print(f"Running eval on {len(stems)} resume(s), live={args.live}, refresh={args.refresh}")
    ok_count = 0
    for stem in stems:
        print(f"[{stem}]")
        if run_one(stem, args.live, args.refresh):
            ok_count += 1

    print(f"\n{ok_count}/{len(stems)} resumes parsed successfully.")
    if ok_count == 0:
        sys.exit(1)

    # Delegate scoring to score.py
    from tests.eval import score as score_mod
    sys.argv = ["score.py", "--parsed-dir", str(PARSED_DIR), "--report", args.report]
    score_mod.main()


if __name__ == "__main__":
    main()
