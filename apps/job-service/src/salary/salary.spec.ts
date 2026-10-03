import {
  annualise,
  deannualise,
  cityFromLocation,
  canonicalCity,
  normalisePayRate,
  normaliseTitle,
  experienceMid,
  bandsOverlap,
} from './salary.units';
import { staticRoleFamily } from './salary.role-family';
import { skillOverlap } from '@ai-job-portal/common';

/**
 * The estimator's arithmetic, tested without a database.
 *
 * These were ported alongside the implementation from the Python service's
 * `test_salary.py`. Keeping them in the repo matters more than usual here: the
 * output is a salary figure shown to an employer, and every case below exists
 * because of a specific way the live data can mislead.
 */

describe('pay rate conversion', () => {
  // jobs.pay_rate is mixed across the table — 42 monthly, 8 daily, 6 weekly,
  // 4 yearly, 4 hourly at last count — so the stored integers are not
  // comparable until they are all annual.
  it.each([
    ['hourly', 2080],
    ['daily', 260],
    ['weekly', 52],
    ['monthly', 12],
    ['yearly', 1],
  ])('%s multiplies by %i', (rate, multiplier) => {
    expect(annualise(100, rate)).toBe(100 * multiplier);
  });

  it('round-trips back to the caller rate', () => {
    for (const rate of ['hourly', 'daily', 'weekly', 'monthly', 'yearly']) {
      expect(deannualise(annualise(50000, rate), rate)).toBe(50000);
    }
  });

  it('treats a missing pay rate as monthly, the commonest in the table', () => {
    expect(normalisePayRate(null)).toBe('monthly');
    expect(annualise(1000, null)).toBe(12000);
  });
});

describe('city parsing', () => {
  // jobs.city is NULL on every row. The employer form writes one free-text
  // `location` field, and people type whatever they like into it.
  it.each([
    ['Udaipur, Rajasthan, Indian, 313001', 'udaipur'],
    ['Mumbai, India', 'mumbai'],
    ['Bangalore', 'bangalore'],
    ['udaipur', 'udaipur'],
    ['Udaipur ', 'udaipur'],
  ])('%s -> %s', (location, expected) => {
    expect(cityFromLocation(location)).toBe(expected);
  });

  it('returns null for an empty location rather than guessing', () => {
    expect(cityFromLocation('')).toBeNull();
    expect(cityFromLocation(null)).toBeNull();
  });

  it('collapses the spellings of one city', () => {
    expect(canonicalCity('Bengaluru')).toBe(canonicalCity('Bangalore'));
  });
});

describe('title handling', () => {
  it('normalises seniority and filler away', () => {
    expect(normaliseTitle('Senior Backend Developer')).toBe(normaliseTitle('Backend Developer'));
  });

  it('maps a known title to its family', () => {
    expect(staticRoleFamily('Senior React Developer')).toBeTruthy();
  });

  it('returns null for a title nobody has seen, rather than inventing one', () => {
    // With the model removed this rung is static-table-only. An unknown title
    // skips it; it does not get a guess.
    expect(staticRoleFamily('Quibble Flurb Wrangler')).toBeNull();
  });
});

describe('experience bands', () => {
  it('takes the midpoint of a band', () => {
    expect(experienceMid(2, 6)).toBe(4);
  });

  it('falls back to the single bound it has', () => {
    expect(experienceMid(3, null)).toBe(3);
    expect(experienceMid(null, 5)).toBe(5);
  });

  it('is null when nothing was given', () => {
    expect(experienceMid(null, null)).toBeNull();
  });

  it('detects overlapping bands', () => {
    expect(bandsOverlap(2, 5, 4, 8)).toBe(true);
    expect(bandsOverlap(2, 3, 7, 9)).toBe(false);
  });
});

describe('skill matching', () => {
  // Employers type the same skill several ways. A mismatch here does not
  // throw — it silently finds no comparables and reports an honest-looking
  // "not enough data".
  it('counts one skill once however it is spelled', () => {
    const { matched, missing } = skillOverlap(['React', 'Docker'], ['ReactJS', 'node.js']);
    expect(matched).toEqual(['React']);
    expect(missing).toEqual(['Docker']);
  });

  it('keeps C++ distinct from C', () => {
    const { matched } = skillOverlap(['C++'], ['C']);
    expect(matched).toEqual([]);
  });
});
