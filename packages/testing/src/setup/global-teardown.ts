import { stash } from 'pactum';

/**
 * Global teardown for E2E tests
 * Called once after all test suites
 */
export async function globalTeardown(): Promise<void> {
  console.log('🧹 Starting E2E test teardown...');

  // Clear test data store
  stash.clearDataStores();

  console.log('✅ E2E test teardown complete');
}

export default globalTeardown;
