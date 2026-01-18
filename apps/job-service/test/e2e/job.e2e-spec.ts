import { spec, stash } from 'pactum';
import { generateJob, generateEmployer, generateCandidate, generateEmployerProfile, SERVICE_PORTS } from '@ai-job-portal/testing';

const AUTH_BASE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;
const USER_BASE_URL = process.env.USER_SERVICE_URL || `http://localhost:${SERVICE_PORTS['user-service']}/api/v1`;

describe('Job Controller (E2E)', () => {
  const employer = generateEmployer();
  const candidate = generateCandidate();

  beforeAll(async () => {
    // Register and login employer
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
      .stores('employer_token', 'accessToken');

    // Create employer profile in user-service (required for job creation)
    try {
      await spec()
        .post(`${USER_BASE_URL}/employers/profile`)
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson(generateEmployerProfile())
        .expectStatus(201);
    } catch (e) {
      // Profile may already exist
    }

    // Register and login candidate
    try {
      await spec()
        .post(`${AUTH_BASE_URL}/auth/register`)
        .withJson({
          email: candidate.email,
          password: candidate.password,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          mobile: candidate.mobile,
          role: 'candidate',
        })
        .expectStatus(201);
    } catch (e) {
      // User may already exist
    }

    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({
        email: candidate.email,
        password: candidate.password,
      })
      .expectStatus(200)
      .stores('candidate_token', 'accessToken');
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('POST /jobs', () => {
    it('should create a new job posting', async () => {
      const job = generateJob();
      await spec()
        .post('/jobs')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson(job)
        .expectStatus(201)
        .expectJsonLike({
          title: job.title,
        })
        .stores('jobId', 'id');
    });

    it('should fail without auth token', async () => {
      await spec()
        .post('/jobs')
        .withJson(generateJob())
        .expectStatus(401);
    });

    it('should fail for non-employer role', async () => {
      await spec()
        .post('/jobs')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson(generateJob())
        .expectStatus(403);
    });
  });

  describe('GET /jobs/:id', () => {
    it('should get job by ID (public)', async () => {
      await spec()
        .get('/jobs/$S{jobId}')
        .expectStatus(200)
        .expectJsonLike({
          id: '$S{jobId}',
        });
    });

    it('should return 404 for non-existent job', async () => {
      await spec()
        .get('/jobs/00000000-0000-0000-0000-000000000000')
        .expectStatus(404);
    });
  });

  describe('PUT /jobs/:id', () => {
    it('should update job posting', async () => {
      await spec()
        .put('/jobs/$S{jobId}')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson({
          title: 'Updated Job Title',
          description: 'Updated job description',
        })
        .expectStatus(200);
    });

    it('should fail without auth token', async () => {
      await spec()
        .put('/jobs/$S{jobId}')
        .withJson({ title: 'Test' })
        .expectStatus(401);
    });
  });

  describe('POST /jobs/:id/publish', () => {
    it('should publish job', async () => {
      await spec()
        .post('/jobs/$S{jobId}/publish')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson({})
        .expect((ctx) => {
          // Accept 200 or 201 depending on implementation
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('POST /jobs/:id/close', () => {
    it('should close job posting', async () => {
      // First create a new job to close
      await spec()
        .post('/jobs')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson(generateJob())
        .expectStatus(201)
        .stores('jobToClose', 'id');

      await spec()
        .post('/jobs/$S{jobToClose}/publish')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson({})
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });

      await spec()
        .post('/jobs/$S{jobToClose}/close')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson({})
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('POST /jobs/:id/save', () => {
    it('should save job for candidate', async () => {
      await spec()
        .post('/jobs/$S{jobId}/save')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson({})
        .expect((ctx) => {
          // Accept 200 or 201 depending on implementation
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('GET /jobs/user/saved', () => {
    it('should get saved jobs', async () => {
      await spec()
        .get('/jobs/user/saved')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .expectStatus(200);
    });
  });

  describe('DELETE /jobs/:id/save', () => {
    it('should unsave job', async () => {
      await spec()
        .delete('/jobs/$S{jobId}/save')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson({})
        .expectStatus(200);
    });
  });

  describe('GET /jobs/employer/my-jobs', () => {
    it('should get employer jobs', async () => {
      await spec()
        .get('/jobs/employer/my-jobs')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(200);
    });

    it('should filter active jobs', async () => {
      await spec()
        .get('/jobs/employer/my-jobs')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withQueryParams({ active: 'true' })
        .expectStatus(200);
    });
  });

  describe('DELETE /jobs/:id', () => {
    it('should delete job', async () => {
      // Create job to delete
      await spec()
        .post('/jobs')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson(generateJob())
        .expectStatus(201)
        .stores('jobToDelete', 'id');

      await spec()
        .delete('/jobs/$S{jobToDelete}')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson({})
        .expectStatus(200);

      // Verify deleted
      await spec()
        .get('/jobs/$S{jobToDelete}')
        .expectStatus(404);
    });
  });
});
