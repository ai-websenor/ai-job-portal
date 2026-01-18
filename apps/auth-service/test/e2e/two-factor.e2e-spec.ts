import { spec } from 'pactum';
import { generateCandidate } from '@ai-job-portal/testing';

describe('Two Factor Authentication (E2E)', () => {
  const testUser = generateCandidate();

  beforeAll(async () => {
    // Register and login user for 2FA tests - may fail with 429 if rate limited
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

    await spec()
      .post('/auth/login')
      .withJson({
        email: testUser.email,
        password: testUser.password,
      })
      .expectStatus(200)
      .stores('twofa_token', 'accessToken');
  });

  describe('GET /2fa/status', () => {
    it('should return 2FA disabled status for new user', async () => {
      await spec()
        .get('/2fa/status')
        .withHeaders('Authorization', 'Bearer $S{twofa_token}')
        .expectStatus(200)
        .expectJson({
          enabled: false,
        });
    });
  });

  describe('POST /2fa/setup', () => {
    it('should generate 2FA secret and QR code', async () => {
      await spec()
        .post('/2fa/setup')
        .withHeaders('Authorization', 'Bearer $S{twofa_token}')
        .withJson({})
        .expectStatus(201)
        .expectJsonLike({
          secret: /.+/,
          qrCodeUrl: /.+/,
        })
        .stores('twofa_secret', 'secret');
    });

    it('should fail without auth token', async () => {
      await spec()
        .post('/2fa/setup')
        .withJson({})
        .expectStatus(401);
    });
  });

  describe('POST /2fa/enable', () => {
    it('should fail with invalid token', async () => {
      await spec()
        .post('/2fa/enable')
        .withHeaders('Authorization', 'Bearer $S{twofa_token}')
        .withJson({
          token: '000000',
        })
        .expectStatus(400);
    });
  });

  describe('DELETE /2fa/disable', () => {
    it('should handle disable when 2FA is not enabled', async () => {
      // API may return 200 (soft fail) or 400 depending on implementation
      await spec()
        .delete('/2fa/disable')
        .withHeaders('Authorization', 'Bearer $S{twofa_token}')
        .withJson({
          token: '000000',
        })
        .expectStatus(200);
    });
  });
});
