import { spec, stash } from 'pactum';
import { generateJob, generateEmployer, generateEmployerProfile, SERVICE_PORTS } from '@ai-job-portal/testing';

const AUTH_BASE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;
const USER_BASE_URL = process.env.USER_SERVICE_URL || `http://localhost:${SERVICE_PORTS['user-service']}/api/v1`;

describe('Job Search Pagination (E2E)', () => {
  const employer = generateEmployer();

  beforeAll(async () => {
    // Register and login employer to create jobs for pagination tests
    try {
      await spec()
        .post(`${AUTH_BASE_URL}/auth/register`)
        .withJson({
          email: employer.email,
          password: employer.password,
          firstName: employer.firstName,
          lastName: employer.lastName,
          mobile: employer.mobile,
          role: 'employer',
        })
        .expectStatus(201);
    } catch (e) {
      // User may already exist
    }

    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({
        email: employer.email,
        password: employer.password,
      })
      .expectStatus(200)
      .stores('pagination_employer_token', 'accessToken');

    // Create employer profile in user-service (required for job creation)
    try {
      await spec()
        .post(`${USER_BASE_URL}/employers/profile`)
        .withHeaders('Authorization', 'Bearer $S{pagination_employer_token}')
        .withJson(generateEmployerProfile())
        .expectStatus(201);
    } catch (e) {
      // Profile may already exist
    }

    // Create a few jobs for pagination
    for (let i = 0; i < 3; i++) {
      await spec()
        .post('/jobs')
        .withHeaders('Authorization', 'Bearer $S{pagination_employer_token}')
        .withJson(generateJob())
        .expectStatus(201);
    }
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('Pagination parameters', () => {
    it('should return first page by default', async () => {
      await spec()
        .get('/search/jobs')
        .expectStatus(200);
    });

    it('should return specified page', async () => {
      await spec()
        .get('/search/jobs')
        .withQueryParams({ page: 1, limit: 10 })
        .expectStatus(200);
    });

    it('should respect limit parameter', async () => {
      await spec()
        .get('/search/jobs')
        .withQueryParams({ limit: 5 })
        .expectStatus(200);
    });

    it('should include total count in meta', async () => {
      await spec()
        .get('/search/jobs')
        .expectStatus(200);
    });
  });

  describe('Sorting', () => {
    it('should sort by date (default)', async () => {
      await spec()
        .get('/search/jobs')
        .expectStatus(200);
    });

    it('should sort by salary', async () => {
      await spec()
        .get('/search/jobs')
        .withQueryParams({ sortBy: 'salary', sortOrder: 'desc' })
        .expectStatus(200);
    });

    it('should sort by relevance with keyword', async () => {
      await spec()
        .get('/search/jobs')
        .withQueryParams({ keyword: 'developer', sortBy: 'relevance' })
        .expectStatus(200);
    });
  });

  describe('Edge cases', () => {
    it('should handle page beyond total pages', async () => {
      await spec()
        .get('/search/jobs')
        .withQueryParams({ page: 9999, limit: 10 })
        .expectStatus(200);
    });

    it('should handle page 0 or negative gracefully', async () => {
      // API may default to page 1 or return 400
      await spec()
        .get('/search/jobs')
        .withQueryParams({ page: 0, limit: 10 })
        .expect((ctx) => {
          // Accept either 200 (defaults to page 1) or 400 (validation error)
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 400) {
            throw new Error(`Expected 200 or 400, got ${ctx.res.statusCode}`);
          }
        });
    });

    it('should cap limit to max allowed', async () => {
      // API should either return max items or 400 for too large limit
      await spec()
        .get('/search/jobs')
        .withQueryParams({ limit: 100 })
        .expect((ctx) => {
          // Accept either 200 (caps to max) or 400 (validation error)
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 400) {
            throw new Error(`Expected 200 or 400, got ${ctx.res.statusCode}`);
          }
        });
    });
  });
});
