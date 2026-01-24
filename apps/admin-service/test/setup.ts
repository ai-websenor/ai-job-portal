import { configurePactum, SERVICE_PORTS, globalSetup, stash } from '@ai-job-portal/testing';

const SERVICE_NAME = 'admin-service';
const API_PREFIX = '/api/v1';
const BASE_URL = process.env.ADMIN_SERVICE_URL || `http://localhost:${SERVICE_PORTS['admin-service']}${API_PREFIX}`;

beforeAll(async () => {
  await globalSetup();
  configurePactum({
    baseUrl: BASE_URL,
    timeout: 30000,
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
  });
});

afterAll(async () => {
  stash.clearDataStores();
});

afterEach(() => {
  // Clear request-specific data after each test if needed
});

export { BASE_URL, SERVICE_NAME };
