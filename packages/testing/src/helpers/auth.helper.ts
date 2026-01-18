import { spec, stash } from 'pactum';
import { faker } from '@faker-js/faker';

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  mobile: string;
  role: 'candidate' | 'employer' | 'admin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate random test user data
 */
export function generateTestUser(role: TestUser['role'] = 'candidate'): TestUser {
  return {
    email: `test_${faker.string.alphanumeric(8)}@test.com`,
    password: 'TestPass123!',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    mobile: `+1${faker.string.numeric(10)}`,
    role,
  };
}

/**
 * Register a new test user and return tokens
 */
export async function registerTestUser(
  baseUrl: string,
  user?: Partial<TestUser>,
): Promise<{ user: TestUser; userId: string }> {
  const testUser = { ...generateTestUser(), ...user };

  const response = await spec()
    .post(`${baseUrl}/auth/register`)
    .withJson({
      email: testUser.email,
      password: testUser.password,
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      mobile: testUser.mobile,
      role: testUser.role,
    })
    .expectStatus(201)
    .returns('userId');

  return { user: testUser, userId: response };
}

/**
 * Login and store tokens in Pactum stash
 */
export async function loginAndStoreTokens(
  baseUrl: string,
  email: string,
  password: string,
  stashPrefix: string = 'auth',
): Promise<AuthTokens> {
  const response = await spec()
    .post(`${baseUrl}/auth/login`)
    .withJson({ email, password })
    .expectStatus(200)
    .stores(`${stashPrefix}_accessToken`, 'accessToken')
    .stores(`${stashPrefix}_refreshToken`, 'refreshToken')
    .returns('res.body');

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  };
}

/**
 * Get authorization header with stored token
 */
export function authHeader(stashKey: string = 'auth_accessToken'): Record<string, string> {
  return {
    Authorization: `Bearer $S{${stashKey}}`,
  };
}

/**
 * Create authenticated user and return tokens (register + login flow)
 */
export async function createAuthenticatedUser(
  baseUrl: string,
  role: TestUser['role'] = 'candidate',
  stashPrefix?: string,
): Promise<{ user: TestUser; userId: string; tokens: AuthTokens }> {
  const { user, userId } = await registerTestUser(baseUrl, { role });

  // In a real scenario, you'd need to verify email first
  // For testing, you might have a bypass or use db.helper to verify directly

  const tokens = await loginAndStoreTokens(
    baseUrl,
    user.email,
    user.password,
    stashPrefix || `user_${userId.slice(0, 8)}`,
  );

  return { user, userId, tokens };
}

/**
 * Clear all stored auth tokens
 */
export function clearAuthStash(): void {
  stash.clearDataStores();
}
