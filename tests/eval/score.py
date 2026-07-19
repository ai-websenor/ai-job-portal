"""Field-level accuracy scorer for resume parse output vs. ground truth.

Comparison rules per field category (see docs/resume-parser-accuracy-plan.md
Phase 0):
- exact: email, phone, linkedin, github, dates, grade, gender — must match
  exactly after light normalization (case-fold, strip).
- normalized: names, company names, degree, institution — case/whitespace/
  punctuation-folded exact match.
- fuzzy: descriptions, summaries, achievements — token-overlap ratio >= 0.6.
- set: skills, languages — precision/recall over the (name) set.

A value present in the parsed output but absent from ground truth is a
**hallucination** — tracked separately from plain misses, since inventing
data is the worse failure mode for this project.
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

EVAL_DIR = Path(__file__).parent
GROUND_TRUTH_DIR = EVAL_DIR / "ground_truth"

# ---------------------------------------------------------------------------
# Normalization helpers
# ---------------------------------------------------------------------------


def _norm(s: Any) -> str:
    if s is None:
        return ""
    s = str(s).strip().lower()
    s = re.sub(r"[.\-,]", "", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def _exact_match(a: Any, b: Any) -> bool:
    return _norm(a) == _norm(b)


def _norm_phone(s: Any) -> str:
    """Digits only, last 10 (ignore country-code / separator differences)."""
    digits = re.sub(r"\D", "", str(s or ""))
    return digits[-10:] if len(digits) >= 10 else digits


def _norm_url(s: Any) -> str:
    """Drop scheme / www / trailing slash so cosmetic URL differences match."""
    u = str(s or "").strip().lower().rstrip("/")
    u = re.sub(r"^https?://", "", u)
    u = re.sub(r"^www\.", "", u)
    return u


def _exact_field_match(field_name: str, a: Any, b: Any) -> bool:
    """Field-aware exact comparison: phone by digit run, profile URLs by
    canonical form, everything else by normalized string."""
    if field_name == "phone":
        return _norm_phone(a) == _norm_phone(b)
    if field_name in ("linkedin", "github"):
        return _norm_url(a) == _norm_url(b)
    return _exact_match(a, b)


def _token_f1(a: Any, b: Any) -> float:
    """Token-overlap F1 — used for fuzzy text fields (descriptions, summaries)."""
    ta = set(_norm(a).split())
    tb = set(_norm(b).split())
    if not ta and not tb:
        return 1.0
    if not ta or not tb:
        return 0.0
    overlap = len(ta & tb)
    precision = overlap / len(ta)
    recall = overlap / len(tb)
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


FUZZY_THRESHOLD = 0.6

EXACT_PERSONAL_FIELDS = ["email", "phone", "linkedin", "github", "gender", "dateOfBirth"]
NORMALIZED_PERSONAL_FIELDS = [
    "firstName", "lastName", "country", "state", "city", "website",
    "nationality", "maritalStatus", "address",
]
FUZZY_PERSONAL_FIELDS = ["headline", "professionalSummary", "hobbies", "declaration"]

EXPERIENCE_EXACT = ["startDate", "endDate", "isCurrent"]
EXPERIENCE_NORMALIZED = ["title", "companyName", "employmentType", "location"]
EXPERIENCE_FUZZY = ["description", "achievements", "skillsUsed"]

EDUCATION_EXACT = ["startDate", "endDate", "grade", "currentlyStudying"]
EDUCATION_NORMALIZED = ["degree", "institution", "fieldOfStudy"]

CERT_NORMALIZED = ["name", "issuingOrganization"]
CERT_EXACT = ["issueDate"]

PROJECT_NORMALIZED = ["name", "role", "duration", "teamSize"]
PROJECT_FUZZY = ["description", "responsibilities"]


@dataclass
class FieldResult:
    field: str
    matched: bool
    expected: Any = None
    actual: Any = None


@dataclass
class ResumeScore:
    resume: str
    field_results: list[FieldResult] = field(default_factory=list)
    hallucinations: list[str] = field(default_factory=list)
    misses: list[str] = field(default_factory=list)
    mismatches: list[str] = field(default_factory=list)  # both sides non-empty but disagree (e.g. fabricated headline)

    @property
    def total(self) -> int:
        return len(self.field_results)

    @property
    def correct(self) -> int:
        return sum(1 for r in self.field_results if r.matched)

    @property
    def accuracy(self) -> float:
        return self.correct / self.total if self.total else 1.0


def _record_mismatch(result: ResumeScore, prefix: str, f: str, exp_v: Any, act_v: Any, truncate: int = 60) -> None:
    """Classify a field disagreement: miss (expected had it, output doesn't),
    hallucination (output invented it, expected didn't), or mismatch (both
    sides non-empty but disagree — e.g. a fabricated headline replacing a
    real one)."""
    if exp_v and not act_v:
        result.misses.append(f"{prefix}.{f}")
    elif act_v and not exp_v:
        result.hallucinations.append(f"{prefix}.{f}={str(act_v)[:truncate]!r}")
    elif exp_v and act_v:
        result.mismatches.append(f"{prefix}.{f}: expected={str(exp_v)[:truncate]!r} actual={str(act_v)[:truncate]!r}")


def _score_scalar_group(
    expected: dict, actual: dict, exact_fields: list[str],
    normalized_fields: list[str], fuzzy_fields: list[str], prefix: str,
    result: ResumeScore,
) -> None:
    for f in exact_fields:
        exp_v, act_v = expected.get(f), actual.get(f)
        matched = _exact_field_match(f, exp_v, act_v)
        result.field_results.append(FieldResult(f"{prefix}.{f}", matched, exp_v, act_v))
        if not matched:
            _record_mismatch(result, prefix, f, exp_v, act_v)

    for f in normalized_fields:
        exp_v, act_v = expected.get(f), actual.get(f)
        matched = _exact_match(exp_v, act_v)
        result.field_results.append(FieldResult(f"{prefix}.{f}", matched, exp_v, act_v))
        if not matched:
            _record_mismatch(result, prefix, f, exp_v, act_v)

    for f in fuzzy_fields:
        exp_v, act_v = expected.get(f, ""), actual.get(f, "")
        if not exp_v and not act_v:
            matched = True
        else:
            matched = _token_f1(exp_v, act_v) >= FUZZY_THRESHOLD
        result.field_results.append(FieldResult(f"{prefix}.{f}", matched, exp_v, act_v))
        if not matched:
            _record_mismatch(result, prefix, f, exp_v, act_v)


def _match_list_items(
    expected_list: list[dict], actual_list: list[dict], key_fields: list[str],
) -> tuple[list[tuple[dict, dict | None]], list[dict]]:
    """Greedy best-match pairing of expected↔actual list items by normalized
    key-field overlap. Returns (pairs, unmatched_actual)."""
    def sig(item: dict) -> str:
        return " ".join(_norm(item.get(f, "")) for f in key_fields)

    remaining_actual = list(actual_list)
    pairs: list[tuple[dict, dict | None]] = []
    for exp_item in expected_list:
        exp_sig = sig(exp_item)
        best, best_score = None, 0.0
        for act_item in remaining_actual:
            score = _token_f1(exp_sig, sig(act_item))
            if score > best_score:
                best, best_score = act_item, score
        if best is not None and best_score >= 0.4:
            pairs.append((exp_item, best))
            remaining_actual.remove(best)
        else:
            pairs.append((exp_item, None))
    return pairs, remaining_actual


def score_resume(expected: dict, actual: dict, resume_name: str) -> ResumeScore:
    result = ResumeScore(resume=resume_name)

    exp_pd = expected.get("personalDetails", {}) or {}
    act_pd = actual.get("personalDetails", {}) or {}
    _score_scalar_group(
        exp_pd, act_pd, EXACT_PERSONAL_FIELDS, NORMALIZED_PERSONAL_FIELDS,
        FUZZY_PERSONAL_FIELDS, "personalDetails", result,
    )

    # experienceDetails — matched by title+companyName
    exp_list = expected.get("experienceDetails", []) or []
    act_list = actual.get("experienceDetails", []) or []
    pairs, extra = _match_list_items(exp_list, act_list, ["title", "companyName"])
    for exp_item, act_item in pairs:
        if act_item is None:
            for f in EXPERIENCE_EXACT + EXPERIENCE_NORMALIZED + EXPERIENCE_FUZZY:
                result.field_results.append(FieldResult(f"experience.{f}", False, exp_item.get(f), None))
            result.misses.append(f"experience[{exp_item.get('title')}@{exp_item.get('companyName')}]")
            continue
        _score_scalar_group(
            exp_item, act_item, EXPERIENCE_EXACT, EXPERIENCE_NORMALIZED,
            EXPERIENCE_FUZZY, "experience", result,
        )
    for act_item in extra:
        result.hallucinations.append(f"experience[{act_item.get('title')}@{act_item.get('companyName')}]")

    # educationalDetails — matched by degree+institution
    exp_list = expected.get("educationalDetails", []) or []
    act_list = actual.get("educationalDetails", []) or []
    pairs, extra = _match_list_items(exp_list, act_list, ["degree", "institution"])
    for exp_item, act_item in pairs:
        if act_item is None:
            for f in EDUCATION_EXACT + EDUCATION_NORMALIZED:
                result.field_results.append(FieldResult(f"education.{f}", False, exp_item.get(f), None))
            result.misses.append(f"education[{exp_item.get('degree')}]")
            continue
        _score_scalar_group(exp_item, act_item, EDUCATION_EXACT, EDUCATION_NORMALIZED, [], "education", result)
    for act_item in extra:
        result.hallucinations.append(f"education[{act_item.get('degree')}]")

    # certifications — matched by name
    exp_list = expected.get("certifications", []) or []
    act_list = actual.get("certifications", []) or []
    pairs, extra = _match_list_items(exp_list, act_list, ["name"])
    for exp_item, act_item in pairs:
        if act_item is None:
            result.field_results.append(FieldResult("certification.name", False, exp_item.get("name"), None))
            result.misses.append(f"certification[{exp_item.get('name')}]")
            continue
        _score_scalar_group(exp_item, act_item, CERT_EXACT, CERT_NORMALIZED, [], "certification", result)
    for act_item in extra:
        result.hallucinations.append(f"certification[{act_item.get('name')}]")

    # projects — matched by name
    exp_list = expected.get("projects", []) or []
    act_list = actual.get("projects", []) or []
    pairs, extra = _match_list_items(exp_list, act_list, ["name"])
    for exp_item, act_item in pairs:
        if act_item is None:
            result.field_results.append(FieldResult("project.name", False, exp_item.get("name"), None))
            result.misses.append(f"project[{exp_item.get('name')}]")
            continue
        _score_scalar_group(exp_item, act_item, [], PROJECT_NORMALIZED, PROJECT_FUZZY, "project", result)
    for act_item in extra:
        result.hallucinations.append(f"project[{act_item.get('name')}]")

    # skills — set match by skillName
    exp_names = {_norm(s.get("skillName")) for s in (expected.get("skills") or []) if s.get("skillName")}
    act_names = {_norm(s.get("skillName")) for s in (actual.get("skills") or []) if s.get("skillName")}
    for name in exp_names:
        matched = name in act_names
        result.field_results.append(FieldResult(f"skill[{name}]", matched, name, name in act_names))
        if not matched:
            result.misses.append(f"skill[{name}]")
    for name in act_names - exp_names:
        result.hallucinations.append(f"skill[{name}]")

    # languages — set match by name
    exp_names = {_norm(l.get("name")) for l in (expected.get("languages") or []) if l.get("name")}
    act_names = {_norm(l.get("name")) for l in (actual.get("languages") or []) if l.get("name")}
    for name in exp_names:
        matched = name in act_names
        result.field_results.append(FieldResult(f"language[{name}]", matched, name, name in act_names))
        if not matched:
            result.misses.append(f"language[{name}]")
    for name in act_names - exp_names:
        result.hallucinations.append(f"language[{name}]")

    return result


def check_schema_shape(actual: dict) -> list[str]:
    """Regression check: every key the current schema defines must be present so
    existing frontend consumers never see a missing key. Keys are derived from
    the live Pydantic models so this can't silently drift out of sync — and it
    genuinely fails if a field is ever removed from the schema."""
    from app.models.resume import PersonalDetails, ResumeOutput

    problems = []
    for k in ResumeOutput.model_fields:
        if k not in actual:
            problems.append(f"missing top-level key: {k}")

    pd = actual.get("personalDetails", {}) or {}
    for k in PersonalDetails.model_fields:
        if k not in pd:
            problems.append(f"missing personalDetails key: {k}")
    return problems


def format_report(scores: list[ResumeScore], schema_problems: dict[str, list[str]]) -> str:
    lines = ["# Resume Parser Eval Report", ""]

    total_fields = sum(s.total for s in scores)
    total_correct = sum(s.correct for s in scores)
    total_halluc = sum(len(s.hallucinations) for s in scores)
    total_mismatch = sum(len(s.mismatches) for s in scores)
    overall_acc = total_correct / total_fields if total_fields else 0.0

    lines.append(f"**Overall field accuracy: {overall_acc:.1%}** ({total_correct}/{total_fields})")
    lines.append(f"**Total hallucinations: {total_halluc}**")
    lines.append(f"**Total wrong values: {total_mismatch}**")
    lines.append(f"**Schema-shape regressions: {sum(len(v) for v in schema_problems.values())}**")
    lines.append("")
    lines.append("| Resume | Accuracy | Correct/Total | Hallucinations | Wrong Values | Misses |")
    lines.append("|---|---|---|---|---|---|")
    for s in scores:
        lines.append(f"| {s.resume} | {s.accuracy:.1%} | {s.correct}/{s.total} | {len(s.hallucinations)} | {len(s.mismatches)} | {len(s.misses)} |")

    lines.append("")
    lines.append("## Hallucination Detail")
    for s in scores:
        if s.hallucinations:
            lines.append(f"\n### {s.resume}")
            for h in s.hallucinations:
                lines.append(f"- {h}")

    lines.append("")
    lines.append("## Miss Detail")
    for s in scores:
        if s.misses:
            lines.append(f"\n### {s.resume}")
            for m in s.misses:
                lines.append(f"- {m}")

    lines.append("")
    lines.append("## Wrong Value Detail (both sides non-empty, disagree)")
    for s in scores:
        if s.mismatches:
            lines.append(f"\n### {s.resume}")
            for m in s.mismatches:
                lines.append(f"- {m}")

    if any(schema_problems.values()):
        lines.append("")
        lines.append("## Schema-Shape Regressions")
        for resume, problems in schema_problems.items():
            if problems:
                lines.append(f"\n### {resume}")
                for p in problems:
                    lines.append(f"- {p}")

    return "\n".join(lines)


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--parsed-dir", default=str(EVAL_DIR / "parsed_output"),
                         help="Directory of <stem>.json parsed outputs to score")
    parser.add_argument("--report", default=str(EVAL_DIR / "eval-report.md"))
    args = parser.parse_args()

    parsed_dir = Path(args.parsed_dir)
    scores = []
    schema_problems = {}

    gt_files = sorted(GROUND_TRUTH_DIR.glob("*.json"))
    if not gt_files:
        print("No ground truth files found in", GROUND_TRUTH_DIR, file=sys.stderr)
        sys.exit(1)

    for gt_path in gt_files:
        stem = gt_path.stem
        parsed_path = parsed_dir / f"{stem}.json"
        if not parsed_path.exists():
            print(f"WARNING: no parsed output for {stem} at {parsed_path}", file=sys.stderr)
            continue
        expected = json.loads(gt_path.read_text(encoding="utf-8"))
        actual = json.loads(parsed_path.read_text(encoding="utf-8"))
        scores.append(score_resume(expected, actual, stem))
        schema_problems[stem] = check_schema_shape(actual)

    if not scores:
        print("No parsed outputs matched any ground truth file.", file=sys.stderr)
        sys.exit(1)

    report = format_report(scores, schema_problems)
    Path(args.report).write_text(report, encoding="utf-8")
    print(report)


if __name__ == "__main__":
    main()
