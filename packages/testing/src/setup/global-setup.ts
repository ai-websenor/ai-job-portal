import { stash } from 'pactum';

/**
 * Global setup for E2E tests
 * Called once before all test suites
 */
export async function globalSetup(): Promise<void> {
  console.log('🚀 Starting E2E test setup...');

  // Clear any stale data from previous runs
  stash.clearDataStores();

  // Verify required environment variables
  const requiredEnvVars = ['DATABASE_URL'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing env vars: ${missingVars.join(', ')}`);
  }

  // Set test environment flag
  process.env.NODE_ENV = 'test';

  console.log('✅ E2E test setup complete');
}

/**
 * Setup function for per-service tests
 */
export function setupServiceTests(serviceName: string, baseUrl: string): void {
  console.log(`📦 Setting up tests for ${serviceName} at ${baseUrl}`);

  // Add service-specific setup here
  stash.addDataMap({
    [`${serviceName}_baseUrl`]: baseUrl,
  });
}

export default globalSetup;
