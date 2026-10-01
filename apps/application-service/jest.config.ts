import type { Config } from 'jest';

/**
 * Unit tests for this service.
 *
 * `test/jest-e2e.config.ts` sits next to this one and covers the end-to-end
 * suite, which needs the whole stack running. This config is for pure logic
 * that can be tested without a database — the applicant scorer's
 * arithmetic being the first of it.
 */
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@ai-job-portal/common$': '<rootDir>/../../../packages/common/src',
    '^@ai-job-portal/common/(.*)$': '<rootDir>/../../../packages/common/src/$1',
  },
};

export default config;
