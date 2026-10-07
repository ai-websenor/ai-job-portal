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
import { SalaryService } from './salary.service';
import {
  EXTERNAL_SALARY_PROVIDERS,
  ExternalSalaryProvider,
  resolveExternalSalaryProvider,
} from './salary.external-source';
import { SalarySettingsService } from './salary.settings';

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
/**
 * The external salary source: the cold-start fallback.
 *
 * Every case here guards a promise made to the employer. The fallback must
 * never outrank platform data, never be dressed up as a market rate, and never
 * turn a provider's bad day into a broken job form. Those are the reasons the
 * feature is defensible, so they are the things worth testing.
 */

/** A database that returns no jobs and no benchmark rows — a fresh install. */
function emptyDb(): any {
  const builder: any = {
    select: () => builder,
    from: () => builder,
    where: () => builder,
    orderBy: () => builder,
    limit: () => Promise.resolve([]),
  };
  return builder;
}

/** Settings fixed at a given state, with no database behind them. */
function fixedSettings(enabled: boolean, provider: string | null): SalarySettingsService {
  return {
    externalSource: async () => ({ enabled, provider }),
    clearCache: () => undefined,
  } as unknown as SalarySettingsService;
}

const FORM = {
  title: 'Flux Capacitor Engineer',
  skills: ['Flux Theory'],
  experienceMin: 3,
  experienceMax: 6,
  location: 'Bangalore, Karnataka',
  payRate: 'yearly',
};

/** Registers a provider for one test and removes it afterwards. */
function withProvider(provider: ExternalSalaryProvider, run: () => Promise<void>) {
  return async () => {
    EXTERNAL_SALARY_PROVIDERS[provider.name] = provider;
    try {
      await run();
    } finally {
      delete EXTERNAL_SALARY_PROVIDERS[provider.name];
    }
  };
}

const workingProvider: ExternalSalaryProvider = {
  name: 'test-source',
  estimate: async () => ({
    p25: 900000,
    p50: 1200000,
    p75: 1500000,
    sourceLabel: 'Test Salary Index',
  }),
};

describe('external salary source selection', () => {
  it('resolves nothing when no provider is configured', () => {
    expect(resolveExternalSalaryProvider(null)).toBeNull();
    expect(resolveExternalSalaryProvider('')).toBeNull();
    expect(resolveExternalSalaryProvider('   ')).toBeNull();
  });

  it('resolves nothing for a provider name that is not registered', () => {
    // An admin can type anything into the setting. A name with nothing behind
    // it must leave the fallback inactive rather than throw on a job form.
    expect(resolveExternalSalaryProvider('not-a-real-provider')).toBeNull();
  });

  it(
    'resolves a registered provider by name, ignoring stray whitespace',
    withProvider(workingProvider, async () => {
      expect(resolveExternalSalaryProvider(' test-source ')).toBe(workingProvider);
    }),
  );
});

describe('external salary source fallback', () => {
  it('ships switched off: an empty platform returns no figures', async () => {
    const service = new SalaryService(emptyDb(), fixedSettings(false, null));
    const result = await service.estimate(FORM as any);

    expect(result.status).toBe('insufficientData');
    expect(result.reason).toBe('noPricedJobs');
    expect(result.typical).toBeNull();
    expect(result.dataSource).toBeNull();
  });

  it(
    'stays off while enabled with no provider selected',
    withProvider(workingProvider, async () => {
      // Enabled is not sufficient. Until someone picks a provider there is
      // nothing to ask, and the honest answer is still "not enough data".
      const service = new SalaryService(emptyDb(), fixedSettings(true, null));
      const result = await service.estimate(FORM as any);

      expect(result.status).toBe('insufficientData');
      expect(result.dataSource).toBeNull();
    }),
  );

  it(
    'answers from the external source when switched on, and labels it honestly',
    withProvider(workingProvider, async () => {
      const service = new SalaryService(emptyDb(), fixedSettings(true, 'test-source'));
      const result = await service.estimate({
        ...FORM,
        // A range 40% under the estimate: comfortably enough to trigger the
        // "below similar roles" warning if the fallback were allowed to.
        currentRange: [700000, 750000],
      } as any);

      expect(result.status).toBe('ok');
      expect(result.dataSource).toBe('externalSource');
      expect(result.method).toBe('externalSource');
      expect(result.range).toEqual({ min: 900000, max: 1500000 });
      expect(result.typical).toBe(1200000);

      // Never confident, whatever the provider claims.
      expect(result.confidence).toBe('low');

      // Never the market warning: we did not look at similar roles.
      expect(result.comparison).toBeNull();

      // The employer is told where the number came from.
      expect(result.explanation).toContain('outside estimate');
      expect(result.basis.map((b) => b.label)).toContain('Estimated outside this platform');
      expect(result.basis.map((b) => b.label)).toContain('Source: Test Salary Index');
    }),
  );

  it(
    'falls back to "not enough data" when the provider returns nothing',
    withProvider({ name: 'silent-source', estimate: async () => null }, async () => {
      const service = new SalaryService(emptyDb(), fixedSettings(true, 'silent-source'));
      const result = await service.estimate(FORM as any);

      expect(result.status).toBe('insufficientData');
      expect(result.typical).toBeNull();
    }),
  );

  it(
    'refuses figures that are not a usable salary band',
    withProvider(
      {
        name: 'broken-source',
        // Zero p25 and a p50 below it. Shown to an employer this would read as
        // a real range starting at nothing.
        estimate: async () => ({ p25: 0, p50: -5, p75: 1200000, sourceLabel: 'Broken' }),
      },
      async () => {
        const service = new SalaryService(emptyDb(), fixedSettings(true, 'broken-source'));
        const result = await service.estimate(FORM as any);

        expect(result.status).toBe('insufficientData');
        expect(result.range).toBeNull();
      },
    ),
  );

  it(
    'survives a provider that throws',
    withProvider(
      {
        name: 'throwing-source',
        estimate: async () => {
          throw new Error('upstream 503');
        },
      },
      async () => {
        const service = new SalaryService(emptyDb(), fixedSettings(true, 'throwing-source'));
        // The employer is mid-way through posting a job. A third party being
        // down must not surface as an error on their form.
        await expect(service.estimate(FORM as any)).resolves.toMatchObject({
          status: 'insufficientData',
        });
      },
    ),
  );

  it(
    'gives up on a provider that never answers',
    withProvider(
      {
        name: 'hanging-source',
        estimate: () => new Promise(() => undefined),
      },
      async () => {
        jest.useFakeTimers();
        try {
          const service = new SalaryService(emptyDb(), fixedSettings(true, 'hanging-source'));
          const pending = service.estimate(FORM as any);
          // Past the 6s budget. Without the timeout this assertion never
          // returns, which is exactly what the employer would experience.
          await jest.advanceTimersByTimeAsync(7000);

          const result = await pending;
          expect(result.status).toBe('insufficientData');
        } finally {
          jest.useRealTimers();
        }
      },
    ),
  );

  it(
    'reflects an admin switching the fallback off again',
    withProvider(workingProvider, async () => {
      // The six-hour result cache is keyed on the provider as well as the job,
      // so flipping the toggle is not shadowed by answers cached before it.
      const db = emptyDb();
      const on = new SalaryService(db, fixedSettings(true, 'test-source'));
      expect((await on.estimate(FORM as any)).status).toBe('ok');

      const off = new SalaryService(db, fixedSettings(false, 'test-source'));
      expect((await off.estimate(FORM as any)).status).toBe('insufficientData');
    }),
  );
});
