import { spec } from 'pactum';
import { generateCandidate } from '@ai-job-portal/testing';

describe('Session Controller (E2E)', () => {
  const testUser = generateCandidate();

  beforeAll(async () => {
    // Register user - may fail with 429 if rate limited
    try {
      await spec()
        .post('/auth/register')
        .withJson({
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          mobile: testUser.mobile,
          role: 'candidate',
        })
        .expectStatus(201);
    } catch (e) {
      // Ignore rate limit errors - user may already exist
    }

    // Login to create session
    await spec()
      .post('/auth/login')
      .withJson({
        email: testUser.email,
        password: testUser.password,
      })
      .expectStatus(200)
      .stores('session_token', 'accessToken');
  });

  describe('GET /users/me/sessions', () => {
    it('should return list of active sessions', async () => {
      await spec()
        .get('/users/me/sessions')
        .withHeaders('Authorization', 'Bearer $S{session_token}')
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              deviceInfo: { type: 'string' },
              lastActive: { type: 'string' },
              current: { type: 'boolean' },
            },
          },
        });
    });

    it('should fail without auth token', async () => {
      await spec()
        .get('/users/me/sessions')
        .expectStatus(401);
    });
  });

  describe('DELETE /users/me/sessions/:id', () => {
    it('should fail to delete non-existent session', async () => {
      // Use valid UUID format that doesn't exist (avoids DB type error)
      await spec()
        .delete('/users/me/sessions/00000000-0000-0000-0000-000000000000')
        .withHeaders('Authorization', 'Bearer $S{session_token}')
        .withJson({})
        .expectStatus(404);
    });
  });

  describe('DELETE /users/me/sessions', () => {
    it('should terminate all other sessions', async () => {
      // First, create another session by logging in again
      await spec()
        .post('/auth/login')
        .withJson({
          email: testUser.email,
          password: testUser.password,
        })
        .expectStatus(200);

      // Then terminate all other sessions
      await spec()
        .delete('/users/me/sessions')
        .withHeaders('Authorization', 'Bearer $S{session_token}')
        .withJson({})
        .expectStatus(200)
        .expectJsonLike({
          message: /.+/,
        });
    });
  });

  describe('GET /users/me/social-logins', () => {
    it('should return empty array for user without social logins', async () => {
      await spec()
        .get('/users/me/social-logins')
        .withHeaders('Authorization', 'Bearer $S{session_token}')
        .expectStatus(200)
        .expectJson([]);
    });
  });

  describe('DELETE /users/me/social-logins/:provider', () => {
    it('should fail to disconnect non-connected provider', async () => {
      await spec()
        .delete('/users/me/social-logins/google')
        .withHeaders('Authorization', 'Bearer $S{session_token}')
        .expectStatus(404);
    });
  });
});
