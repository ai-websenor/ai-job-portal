#!/usr/bin/env node

/**
 * Salary benchmark importer
 * Usage: pnpm seed:salary-benchmarks <file.csv> [--dry-run] [--replace]
 *
 * Loads market salary reference rows into `salary_benchmarks`, which the
 * salary estimator falls back to when our own postings cannot price a role.
 *
 * Why this exists: with only a few dozen live jobs, most roles have too few
 * comparable postings to estimate from, so the estimator honestly refuses.
 * Importing attributed benchmark data switches the feature on immediately.
 *
 * Every row must carry a `source`. An estimate shown to an employer has to be
 * defensible when they ask where the number came from, so rows whose source is
 * missing, or still the template's placeholder, are rejected.
 *
 * CSV columns:
 *   role_family, city, experience_min, experience_max, pay_rate, currency,
 *   p25, p50, p75, source, effective_from
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

// Everything is stored at the rate given, but the estimator compares in annual
// terms, so a nonsense rate has to be caught here rather than skewing a range.
const PAY_RATES = new Set(['hourly', 'daily', 'weekly', 'monthly', 'yearly']);
const PLACEHOLDER_SOURCE = 'EXAMPLE-REPLACE-ME';

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const header = splitRow(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line, index) => {
    const cells = splitRow(line);
    const row = { __line: index + 2 };
    header.forEach((key, i) => {
      row[key] = (cells[i] ?? '').trim();
    });
    return row;
  });
}

/** Minimal CSV splitter: handles quoted cells containing commas. */
function splitRow(line) {
  const out = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      out.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  out.push(cell);
  return out;
}

function validate(row) {
  const problems = [];

  const roleFamily = (row.role_family || '').toLowerCase();
  if (!roleFamily) problems.push('role_family is required');

  const source = row.source || '';
  if (!source) problems.push('source is required');
  if (source === PLACEHOLDER_SOURCE) {
    problems.push(
      'source is still the template placeholder — replace it with where the data came from',
    );
  }

  const payRate = (row.pay_rate || 'yearly').toLowerCase();
  if (!PAY_RATES.has(payRate)) {
    problems.push(`pay_rate "${row.pay_rate}" is not one of ${[...PAY_RATES].join(', ')}`);
  }

  const percentiles = {};
  for (const key of ['p25', 'p50', 'p75']) {
    const value = Number(row[key]);
    if (!Number.isFinite(value) || value <= 0) {
      problems.push(`${key} must be a positive number`);
    }
    percentiles[key] = Math.round(value);
  }

  if (
    !problems.length &&
    !(percentiles.p25 <= percentiles.p50 && percentiles.p50 <= percentiles.p75)
  ) {
    problems.push('percentiles must be ordered p25 <= p50 <= p75');
  }

  return {
    problems,
    value: {
      roleFamily,
      city: (row.city || '').toLowerCase() || null,
      experienceMin: row.experience_min === '' ? null : Number(row.experience_min),
      experienceMax: row.experience_max === '' ? null : Number(row.experience_max),
      payRate,
      currency: (row.currency || 'INR').toUpperCase(),
      ...percentiles,
      source,
      effectiveFrom: row.effective_from || null,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const replace = args.includes('--replace');

  if (!file) {
    console.error('Usage: pnpm seed:salary-benchmarks <file.csv> [--dry-run] [--replace]');
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  if (!rows.length) {
    console.error('No data rows found.');
    process.exit(1);
  }

  const accepted = [];
  let rejected = 0;

  for (const row of rows) {
    const { problems, value } = validate(row);
    if (problems.length) {
      rejected += 1;
      console.error(`  line ${row.__line}: ${problems.join('; ')}`);
      continue;
    }
    accepted.push(value);
  }

  console.log(`\n${accepted.length} row(s) valid, ${rejected} rejected.`);

  if (!accepted.length) {
    console.error('Nothing to import.');
    process.exit(1);
  }

  if (dryRun) {
    console.log('--dry-run: nothing written.');
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query('BEGIN');

    if (replace) {
      const sources = [...new Set(accepted.map((r) => r.source))];
      const { rowCount } = await client.query(
        'DELETE FROM salary_benchmarks WHERE source = ANY($1::text[])',
        [sources],
      );
      console.log(`--replace: removed ${rowCount} existing row(s) for ${sources.join(', ')}.`);
    }

    for (const r of accepted) {
      await client.query(
        `INSERT INTO salary_benchmarks
           (role_family, city, experience_min, experience_max, pay_rate, currency,
            p25, p50, p75, source, effective_from)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          r.roleFamily,
          r.city,
          r.experienceMin,
          r.experienceMax,
          r.payRate,
          r.currency,
          r.p25,
          r.p50,
          r.p75,
          r.source,
          r.effectiveFrom,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(`Imported ${accepted.length} benchmark row(s).`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
