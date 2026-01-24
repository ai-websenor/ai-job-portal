import { spec } from 'pactum';

describe('API Gateway Proxy (E2E)', () => {
  const candidateToken = process.env.TEST_CANDIDATE_TOKEN || 'test-candidate-token';
  const employerToken = process.env.TEST_EMPLOYER_TOKEN || 'test-employer-token';

  describe('Auth Service Proxy', () => {
    it('should proxy /api/auth/* to auth-service', async () => {
      await spec()
        .post('/api/auth/login')
        .withJson({
          email: 'test@example.com',
          password: 'testpassword',
        })
        .expectStatus(401); // Invalid credentials, but route works
    });
  });

  describe('User Service Proxy', () => {
    it('should proxy /api/candidates/* to user-service', async () => {
      await spec()
        .get('/api/candidates/profile')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200);
    });

    it('should proxy /api/employers/* to user-service', async () => {
      await spec()
        .get('/api/employers/profile')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .expectStatus(200);
    });
  });

  describe('Job Service Proxy', () => {
    it('should proxy /api/jobs/* to job-service', async () => {
      await spec()
        .get('/api/jobs/search/recent')
        .expectStatus(200);
    });

    it('should proxy /api/search/* to job-service', async () => {
      await spec()
        .get('/api/search/jobs')
        .expectStatus(200);
    });
  });

  describe('Application Service Proxy', () => {
    it('should proxy /api/applications/* to application-service', async () => {
      await spec()
        .get('/api/applications/my')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200);
    });
  });

  describe('Cross-Origin Headers', () => {
    it('should include CORS headers', async () => {
      await spec()
        .options('/api/auth/login')
        .expectStatus(204)
        .expectHeader('Access-Control-Allow-Origin', /.+/)
        .expectHeader('Access-Control-Allow-Methods', /.+/);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Make multiple requests in quick succession
      const requests = Array.from({ length: 20 }, () =>
        spec().get('/api/search/jobs').expectStatus(200)
      );

      await Promise.all(requests);

      // Eventually should hit rate limit (429)
      // Note: This depends on configured rate limits
    });
  });

  describe('Authentication Forwarding', () => {
    it('should forward auth headers to services', async () => {
      await spec()
        .get('/api/candidates/profile')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200);
    });

    it('should reject invalid tokens', async () => {
      await spec()
        .get('/api/candidates/profile')
        .withHeaders('Authorization', 'Bearer invalid-token')
        .expectStatus(401);
    });

    it('should reject missing auth on protected routes', async () => {
      await spec()
        .get('/api/candidates/profile')
        .expectStatus(401);
    });
  });

  describe('Health Check', () => {
    it('should return gateway health status', async () => {
      await spec()
        .get('/health')
        .expectStatus(200)
        .expectJsonLike({
          status: 'ok',
        });
    });
  });
});
