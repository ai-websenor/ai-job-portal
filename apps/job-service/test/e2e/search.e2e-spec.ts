/* eslint-disable @typescript-eslint/no-unused-vars */
import { spec, stash } from 'pactum';
import {
  generateJob,
  generateEmployer,
  generateEmployerProfile,
  SERVICE_PORTS,
} from '@ai-job-portal/testing';

const AUTH_BASE_URL =
  process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;
const USER_BASE_URL =
  process.env.USER_SERVICE_URL || `http://localhost:${SERVICE_PORTS['user-service']}/api/v1`;

describe('Search Controller (E2E)', () => {
  const employer = generateEmployer();

  beforeAll(async () => {
    // Register and login employer to create a job for search tests
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
      .stores('search_employer_token', 'accessToken');

    // Create employer profile in user-service (required for job creation)
    try {
      await spec()
        .post(`${USER_BASE_URL}/employers/profile`)
        .withHeaders('Authorization', 'Bearer $S{search_employer_token}')
        .withJson(generateEmployerProfile())
        .expectStatus(201);
    } catch (e) {
      // Profile may already exist
    }

    // Create a job for search tests
    await spec()
      .post('/jobs')
      .withHeaders('Authorization', 'Bearer $S{search_employer_token}')
      .withJson(generateJob())
      .expectStatus(201)
      .stores('searchJobId', 'id');

    // Publish the job
    await spec()
      .post('/jobs/$S{searchJobId}/publish')
      .withHeaders('Authorization', 'Bearer $S{search_employer_token}')
      .withJson({})
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('GET /search/jobs', () => {
    it('should search jobs without filters', async () => {
      await spec().get('/search/jobs').expectStatus(200);
    });

    it('should search jobs with keyword', async () => {
      await spec().get('/search/jobs').withQueryParams({ keyword: 'developer' }).expectStatus(200);
    });

    it('should search jobs with location filter', async () => {
      await spec().get('/search/jobs').withQueryParams({ location: 'Remote' }).expectStatus(200);
    });

    it('should search jobs with multiple filters', async () => {
      await spec()
        .get('/search/jobs')
        .withQueryParams({
          keyword: 'engineer',
          workMode: 'remote',
          experienceLevel: 'mid',
        })
        .expectStatus(200);
    });

    it('should search jobs with salary range', async () => {
      await spec()
        .get('/search/jobs')
        .withQueryParams({
          salaryMin: 50000,
          salaryMax: 100000,
        })
        .expectStatus(200);
    });
  });

  describe('GET /search/jobs/featured', () => {
    it('should get featured jobs', async () => {
      await spec().get('/search/jobs/featured').expectStatus(200);
    });

    it('should limit featured jobs', async () => {
      await spec().get('/search/jobs/featured').withQueryParams({ limit: 5 }).expectStatus(200);
    });
  });

  describe('GET /search/jobs/recent', () => {
    it('should get recent jobs', async () => {
      await spec().get('/search/jobs/recent').expectStatus(200);
    });

    it('should limit recent jobs', async () => {
      await spec().get('/search/jobs/recent').withQueryParams({ limit: 10 }).expectStatus(200);
    });
  });

  describe('GET /search/jobs/:id/similar', () => {
    it('should get similar jobs', async () => {
      await spec().get('/search/jobs/$S{searchJobId}/similar').expectStatus(200);
    });
  });
});
