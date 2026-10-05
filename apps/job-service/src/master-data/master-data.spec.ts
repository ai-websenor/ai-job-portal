import {
  clampSearchLimit,
  DEFAULT_SEARCH_LIMIT,
  escapeLikePattern,
  isCaptureableName,
  MAX_SEARCH_LIMIT,
  MIN_SEARCH_LIMIT,
  normaliseName,
} from './master-data.rules';

/**
 * The rules behind the master-data dropdowns, tested without a database.
 *
 * Each case below exists because of something in the live data or in the
 * request shape, not for coverage: the capture rule guards the admin review
 * queue against rubbish that is already in the `jobs` table, and the limit
 * clamp guards the dropdown against a caller asking for everything.
 */

describe('isCaptureableName — what becomes a user-typed master row', () => {
  it.each([
    ['Backend Developer'],
    ['B.Tech in Computer Science'],
    ['AWS Certified Solutions Architect'],
    ['QA'],
    ['C++'],
    ['  Trimmed Title  '],
    // Digits mixed with anything else is a real value, e.g. a cloud cert.
    ['AZ-900'],
    ['10th Standard'],
  ])('captures %j', (name) => {
    expect(isCaptureableName(name)).toBe(true);
  });

  it.each([
    ['', 'empty'],
    ['   ', 'whitespace only'],
    ['\t\n', 'whitespace only'],
  ])('skips %j (%s)', (name) => {
    expect(isCaptureableName(name)).toBe(false);
  });

  it.each([['a'], ['1'], [' x ']])('skips the single character %j', (name) => {
    expect(isCaptureableName(name)).toBe(false);
  });

  // The live jobs table holds qualifications of "1", "3" and "34". They are
  // not qualifications, and the seed migration skipped them for this reason.
  it.each([['1'], ['3'], ['34'], ['2024'], ['0000'], [' 34 ']])(
    'skips the digits-only value %j',
    (name) => {
      expect(isCaptureableName(name)).toBe(false);
    },
  );

  it.each([[null], [undefined], [42], [{}], [[]]])('skips the non-string %j', (value) => {
    expect(isCaptureableName(value)).toBe(false);
  });
});

describe('normaliseName', () => {
  it('trims', () => {
    expect(normaliseName('  Backend Developer \n')).toBe('Backend Developer');
  });

  it('gives an empty string for anything that is not a string', () => {
    expect(normaliseName(undefined)).toBe('');
    expect(normaliseName(null)).toBe('');
    expect(normaliseName(7)).toBe('');
  });
});

describe('clampSearchLimit', () => {
  it('defaults when nothing usable is given', () => {
    expect(clampSearchLimit(undefined)).toBe(DEFAULT_SEARCH_LIMIT);
    expect(clampSearchLimit(null)).toBe(DEFAULT_SEARCH_LIMIT);
    expect(clampSearchLimit('')).toBe(DEFAULT_SEARCH_LIMIT);
    expect(clampSearchLimit('abc')).toBe(DEFAULT_SEARCH_LIMIT);
    expect(clampSearchLimit(Number.NaN)).toBe(DEFAULT_SEARCH_LIMIT);
  });

  it('accepts a query string, which is how it arrives over HTTP', () => {
    expect(clampSearchLimit('5')).toBe(5);
    expect(clampSearchLimit('25')).toBe(25);
  });

  it('accepts a number', () => {
    expect(clampSearchLimit(5)).toBe(5);
  });

  it('floors to the minimum', () => {
    expect(clampSearchLimit(0)).toBe(MIN_SEARCH_LIMIT);
    expect(clampSearchLimit(-5)).toBe(MIN_SEARCH_LIMIT);
  });

  it('caps at the maximum', () => {
    expect(clampSearchLimit(MAX_SEARCH_LIMIT + 1)).toBe(MAX_SEARCH_LIMIT);
    expect(clampSearchLimit(100000)).toBe(MAX_SEARCH_LIMIT);
  });

  it('truncates a fractional limit rather than passing it to LIMIT', () => {
    expect(clampSearchLimit('7.9')).toBe(7);
    expect(clampSearchLimit(7.9)).toBe(7);
  });
});

describe('escapeLikePattern', () => {
  it('leaves an ordinary name alone', () => {
    expect(escapeLikePattern('Backend Developer')).toBe('Backend Developer');
  });

  // Without escaping, searching "100%" would match every row.
  it('escapes the percent wildcard', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%');
  });

  it('escapes the underscore wildcard', () => {
    expect(escapeLikePattern('C_C')).toBe('C\\_C');
  });

  it('escapes the escape character itself, first', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
    expect(escapeLikePattern('\\%')).toBe('\\\\\\%');
  });
});
