import { bandFor, yearsText, summaryFor, roundHalfEven } from './applicant-score.rules';
import { PROTECTED_FIELDS, anonymiseProfile } from './applicant-score.extract';

/**
 * The scorer's arithmetic and wording, tested without a database.
 *
 * This output decides which applicants an employer looks at first, so each
 * case below guards something specific that went wrong, or could.
 */

describe('the skills ceiling', () => {
  // A real applicant scored 70 and was presented as a "Good match" while
  // covering two of the eight skills the job listed — a long career and a
  // tidy resume carried the total. On a shortlisting screen that is exactly
  // the wrong signal, so skills coverage now caps what the headline may claim.
  it('does not let experience and formatting buy a good-match headline', () => {
    const [band, headline] = bandFor(70, 25);
    expect(band).toBe('needsWork');
    expect(headline).toBe('Limited match for this role');
  });

  it('caps middling coverage at a partial match', () => {
    expect(bandFor(88, 45)[0]).toBe('fair');
  });

  it('leaves good coverage uncapped', () => {
    expect(bandFor(88, 75)[0]).toBe('excellent');
    expect(bandFor(70, 60)[0]).toBe('good');
  });

  it('only ever lowers a claim, never raises one', () => {
    expect(bandFor(20, 100)[0]).toBe('needsWork');
    expect(bandFor(55, 100)[0]).toBe('fair');
  });

  it('has no ceiling without a target job, since there is nothing to cover', () => {
    expect(bandFor(88, null)[0]).toBe('excellent');
  });
});

describe('summary wording', () => {
  // Keyed on the band awarded rather than the raw score, so the sentence can
  // never contradict the headline directly above it.
  it('follows the band, not the number', () => {
    expect(summaryFor('needsWork', 2, true)).toMatch(/Misses several/);
    expect(summaryFor('excellent', 0, true)).toMatch(/nearly everything/);
  });
});

describe('career length', () => {
  // total_experience_years arrives as a computed decimal. "14.08 years" is
  // false precision about somebody's career.
  it.each([
    [14.08, '14 years'],
    [7, '7 years'],
    [1, '1 year'],
    [2.5, '2.5 years'],
    [0.4, 'under a year'],
  ])('%p reads as %s', (input, expected) => {
    expect(yearsText(input as number)).toBe(expected);
  });
});

describe('rounding', () => {
  // Python rounds half to even; JavaScript rounds half up. Bucket percentages
  // land on halves routinely, so matching Python keeps this service and the
  // original engine from drifting apart on the same candidate.
  it('rounds half to even, as the original does', () => {
    expect(roundHalfEven(32.5)).toBe(32);
    expect(roundHalfEven(33.5)).toBe(34);
  });
});

describe('fairness', () => {
  // The score informs hiring, so protected attributes are removed at load
  // rather than merely ignored by the checks. A future check cannot read a
  // field that is not on the object.
  it('builds the scored profile without any protected field', () => {
    const raw = {
      firstName: 'Priya',
      lastName: 'Sharma',
      gender: 'female',
      dateOfBirth: '1990-01-01',
      maritalStatus: 'married',
      nationality: 'Indian',
      profilePhoto: 'https://example.test/p.jpg',
      address: '12 Example Street',
      userEmail: 'priya@example.test',
      phone: '9999999999',
      totalExperienceYears: 7,
    } as unknown as Parameters<typeof anonymiseProfile>[0];

    const scrubbed = anonymiseProfile(raw, {
      skills: ['React'],
      education: [],
      experience: [],
    }) as unknown as Record<string, unknown>;

    for (const field of PROTECTED_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(scrubbed, field)).toBe(false);
    }
    // Contact details survive only as "is there a way to reach them".
    expect(scrubbed.userEmail).toBe('present');
    expect(scrubbed.phone).toBe('present');
    // Everything the score is actually allowed to use is untouched.
    expect(scrubbed.totalExperienceYears).toBe(7);
  });

  it('reduces absent contact details to empty, not to a value', () => {
    const raw = { userEmail: '', phone: null } as unknown as Parameters<typeof anonymiseProfile>[0];

    const scrubbed = anonymiseProfile(raw, {
      skills: [],
      education: [],
      experience: [],
    }) as unknown as Record<string, unknown>;

    expect(scrubbed.userEmail).toBe('');
    expect(scrubbed.phone).toBe('');
  });
});
