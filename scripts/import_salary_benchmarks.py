#!/usr/bin/env python
"""Load a salary benchmark CSV into the `salary_benchmarks` table.

The cold-start safety net for the salary estimator. Our own job board has ~57
priced postings across 53 distinct titles, so plenty of roles cannot be priced
from live comparables. This table fills those gaps — but only with figures
somebody is prepared to stand behind, which is why `source` is mandatory and
is shown to the employer alongside the range.

Usage
-----
    python scripts/import_salary_benchmarks.py path/to/benchmarks.csv
    python scripts/import_salary_benchmarks.py path/to/benchmarks.csv --dry-run
    python scripts/import_salary_benchmarks.py path/to/benchmarks.csv --replace

Options
-------
    --dry-run   Validate and report, write nothing.
    --replace   Delete existing rows for each (role_family, city, source)
                touched by the file before inserting. Without it, rows are
                appended and the estimator averages across them.

CSV columns (see `scripts/salary_benchmarks_template.csv`)
---------------------------------------------------------
    role_family      required, free text, stored lowercased
    city             optional, blank means "nationwide"
    experience_min   optional integer, years
    experience_max   optional integer, years
    pay_rate         hourly | daily | weekly | monthly | yearly
    currency         defaults to INR
    p25, p50, p75    required integers in `pay_rate` units, p25 <= p50 <= p75
    source           required, e.g. "Naukri JobSpeak 2026 H1"
    effective_from   optional ISO date (YYYY-MM-DD)

Rows whose `source` still says EXAMPLE-REPLACE-ME are refused. The shipped
template carries zeroed example rows on purpose: inventing plausible-looking
market salaries and presenting them to an employer as data would be worse than
the honest "not enough data yet" the estimator falls back to.
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from datetime import date, datetime

# Allow `python scripts/import_salary_benchmarks.py` from the repo root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import get_db  # noqa: E402
from app.salary.units import PAY_RATE_MULTIPLIERS  # noqa: E402

REQUIRED_COLUMNS = {"role_family", "pay_rate", "p25", "p50", "p75", "source"}
PLACEHOLDER_SOURCE = "example-replace-me"


class RowError(ValueError):
    """A CSV row that cannot be imported, with the reason."""


def _clean(value: str | None) -> str:
    return " ".join(str(value or "").strip().split())


def _optional_int(value: str | None, field: str) -> int | None:
    text = _clean(value)
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        raise RowError(f"{field} is not a number: {value!r}")


def _required_int(value: str | None, field: str) -> int:
    parsed = _optional_int(value, field)
    if parsed is None:
        raise RowError(f"{field} is required")
    if parsed <= 0:
        raise RowError(f"{field} must be greater than zero (got {parsed})")
    return parsed


def _parse_date(value: str | None) -> date | None:
    text = _clean(value)
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    raise RowError(f"effective_from is not a recognised date: {value!r}")


def parse_row(row: dict) -> dict:
    """Validate one CSV row into the values the table expects."""
    role_family = _clean(row.get("role_family")).lower()
    if not role_family:
        raise RowError("role_family is required")

    source = _clean(row.get("source"))
    if not source:
        raise RowError("source is required - an unattributed benchmark is not usable")
    if source.lower() == PLACEHOLDER_SOURCE:
        raise RowError(
            "source is still the template placeholder - replace the example rows "
            "with real, attributable benchmark data"
        )

    pay_rate = _clean(row.get("pay_rate")).lower() or "yearly"
    if pay_rate not in PAY_RATE_MULTIPLIERS:
        raise RowError(
            f"pay_rate must be one of {', '.join(sorted(PAY_RATE_MULTIPLIERS))} "
            f"(got {pay_rate!r})"
        )

    p25 = _required_int(row.get("p25"), "p25")
    p50 = _required_int(row.get("p50"), "p50")
    p75 = _required_int(row.get("p75"), "p75")
    if not p25 <= p50 <= p75:
        raise RowError(f"percentiles must be ordered: p25={p25} p50={p50} p75={p75}")

    experience_min = _optional_int(row.get("experience_min"), "experience_min")
    experience_max = _optional_int(row.get("experience_max"), "experience_max")
    if (
        experience_min is not None
        and experience_max is not None
        and experience_min > experience_max
    ):
        raise RowError(
            f"experience_min ({experience_min}) is above experience_max ({experience_max})"
        )

    return {
        "role_family": role_family,
        "city": _clean(row.get("city")).lower() or None,
        "experience_min": experience_min,
        "experience_max": experience_max,
        "pay_rate": pay_rate,
        "currency": (_clean(row.get("currency")) or "INR").upper(),
        "p25": p25,
        "p50": p50,
        "p75": p75,
        "source": source,
        "effective_from": _parse_date(row.get("effective_from")),
    }


def read_csv(path: str) -> tuple[list[dict], list[str]]:
    """Return (valid rows, human-readable errors)."""
    with open(path, newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        headers = {(h or "").strip().lower() for h in (reader.fieldnames or [])}
        missing = REQUIRED_COLUMNS - headers
        if missing:
            raise SystemExit(
                f"CSV is missing required column(s): {', '.join(sorted(missing))}"
            )

        rows: list[dict] = []
        errors: list[str] = []
        for line_number, raw in enumerate(reader, start=2):
            normalised = {(k or "").strip().lower(): v for k, v in raw.items()}
            if not any(_clean(v) for v in normalised.values()):
                continue  # blank line
            try:
                rows.append(parse_row(normalised))
            except RowError as e:
                errors.append(f"line {line_number}: {e}")

    return rows, errors


def write_rows(rows: list[dict], replace: bool) -> int:
    """Insert rows, optionally clearing what the file supersedes first."""
    inserted = 0
    with get_db() as conn:
        with conn.cursor() as cur:
            if replace:
                scopes = {(r["role_family"], r["city"], r["source"]) for r in rows}
                for role_family, city, source in scopes:
                    cur.execute(
                        """
                        DELETE FROM salary_benchmarks
                        WHERE lower(role_family) = %s
                          AND source = %s
                          AND (
                              (%s::text IS NULL AND city IS NULL)
                              OR lower(city) = %s::text
                          )
                        """,
                        (role_family, source, city, city),
                    )

            for row in rows:
                cur.execute(
                    """
                    INSERT INTO salary_benchmarks
                        (role_family, city, experience_min, experience_max,
                         pay_rate, currency, p25, p50, p75, source, effective_from)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        row["role_family"], row["city"],
                        row["experience_min"], row["experience_max"],
                        row["pay_rate"], row["currency"],
                        row["p25"], row["p50"], row["p75"],
                        row["source"], row["effective_from"],
                    ),
                )
                inserted += 1
    return inserted


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import salary benchmarks from a CSV into salary_benchmarks."
    )
    parser.add_argument("csv_path", help="Path to the benchmark CSV")
    parser.add_argument(
        "--dry-run", action="store_true", help="Validate only, write nothing"
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete existing rows for each (role_family, city, source) in the file first",
    )
    args = parser.parse_args()

    if not os.path.isfile(args.csv_path):
        print(f"No such file: {args.csv_path}", file=sys.stderr)
        return 2

    rows, errors = read_csv(args.csv_path)

    for error in errors:
        print(f"SKIPPED {error}", file=sys.stderr)

    if not rows:
        print("Nothing to import - no valid rows found.", file=sys.stderr)
        return 1

    print(f"{len(rows)} valid row(s), {len(errors)} skipped.")

    if args.dry_run:
        for row in rows[:10]:
            print(
                f"  {row['role_family']} / {row['city'] or 'nationwide'} / "
                f"{row['experience_min']}-{row['experience_max']}y / {row['pay_rate']}: "
                f"{row['p25']}-{row['p50']}-{row['p75']} ({row['source']})"
            )
        if len(rows) > 10:
            print(f"  ... and {len(rows) - 10} more")
        print("Dry run - nothing written.")
        return 0

    inserted = write_rows(rows, replace=args.replace)
    print(f"Inserted {inserted} benchmark row(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
