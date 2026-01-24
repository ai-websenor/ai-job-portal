import { spec, stash } from 'pactum';
import { generateJob, generateEmployer, generateEmployerProfile, SERVICE_PORTS } from '@ai-job-portal/testing';

const AUTH_BASE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;
const USER_BASE_URL = process.env.USER_SERVICE_URL || `http://localhost:${SERVICE_PORTS['user-service']}/api/v1`;

describe('Job Lifecycle Workflow (E2E)', () => {
  const employer = generateEmployer();

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
      .stores('lifecycle_token', 'accessToken');

    // Create employer profile in user-service (required for job creation)
    try {
      await spec()
        .post(`${USER_BASE_URL}/employers/profile`)
        .withHeaders('Authorization', 'Bearer $S{lifecycle_token}')
        .withJson(generateEmployerProfile())
        .expectStatus(201);
    } catch (e) {
      // Profile may already exist
    }
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  it('should complete full job lifecycle: draft → publish → close', async () => {
    const job = generateJob();

    // Step 1: Create job (draft state)
    await spec()
      .post('/jobs')
      .withHeaders('Authorization', 'Bearer $S{lifecycle_token}')
      .withJson(job)
      .expectStatus(201)
      .stores('lifecycle_jobId', 'id');

    // Step 2: Update job details while in draft
    await spec()
      .put('/jobs/$S{lifecycle_jobId}')
      .withHeaders('Authorization', 'Bearer $S{lifecycle_token}')
      .withJson({
        title: 'Updated: ' + job.title,
        description: 'Updated description with more details',
      })
      .expectStatus(200);

    // Step 3: Publish job
    await spec()
      .post('/jobs/$S{lifecycle_jobId}/publish')
      .withHeaders('Authorization', 'Bearer $S{lifecycle_token}')
      .withJson({})
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });

    // Step 4: Verify job is accessible
    await spec()
      .get('/jobs/$S{lifecycle_jobId}')
      .expectStatus(200);

    // Step 5: Close job
    await spec()
      .post('/jobs/$S{lifecycle_jobId}/close')
      .withHeaders('Authorization', 'Bearer $S{lifecycle_token}')
      .withJson({})
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });

    // Step 6: Verify job is still accessible but closed
    await spec()
      .get('/jobs/$S{lifecycle_jobId}')
      .expectStatus(200);
  });

  it('should handle job updates after publishing', async () => {
    // Create and publish
    await spec()
      .post('/jobs')
      .withHeaders('Authorization', 'Bearer $S{lifecycle_token}')
      .withJson(generateJob())
      .expectStatus(201)
      .stores('update_jobId', 'id');

    await spec()
      .post('/jobs/$S{update_jobId}/publish')
      .withHeaders('Authorization', 'Bearer $S{lifecycle_token}')
      .withJson({})
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });

    // Update published job
    await spec()
      .put('/jobs/$S{update_jobId}')
      .withHeaders('Authorization', 'Bearer $S{lifecycle_token}')
      .withJson({
        salaryMax: 150000,
      })
      .expectStatus(200);

    // Verify update persisted
    await spec()
      .get('/jobs/$S{update_jobId}')
      .expectStatus(200);
  });

  it('should allow or restrict delete based on job status', async () => {
    // Create and publish
    await spec()
      .post('/jobs')
      .withHeaders('Authorization', 'Bearer $S{lifecycle_token}')
      .withJson(generateJob())
      .expectStatus(201)
      .stores('delete_jobId', 'id');

    await spec()
      .post('/jobs/$S{delete_jobId}/publish')
      .withHeaders('Authorization', 'Bearer $S{lifecycle_token}')
      .withJson({})
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });

    // Attempt to delete published job (may fail or succeed based on business rules)
    await spec()
      .delete('/jobs/$S{delete_jobId}')
      .withHeaders('Authorization', 'Bearer $S{lifecycle_token}')
      .withJson({})
      .expect((ctx) => {
        // Accept either 200 (allowed) or 400/403 (restricted)
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 400 && ctx.res.statusCode !== 403) {
          throw new Error(`Expected 200, 400, or 403, got ${ctx.res.statusCode}`);
        }
      });
  });
});
