import { spec, stash } from 'pactum';
import {
  generateJob,
  generateEmployer,
  generateCandidate,
  generateEmployerProfile,
  generateCandidateProfile,
  SERVICE_PORTS,
  faker,
} from '@ai-job-portal/testing';

const AUTH_BASE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;
const USER_BASE_URL = process.env.USER_SERVICE_URL || `http://localhost:${SERVICE_PORTS['user-service']}/api/v1`;
const JOB_BASE_URL = process.env.JOB_SERVICE_URL || `http://localhost:${SERVICE_PORTS['job-service']}/api/v1`;
const APP_BASE_URL = process.env.APPLICATION_SERVICE_URL
  ? `${process.env.APPLICATION_SERVICE_URL}/api/v1`
  : `http://localhost:${SERVICE_PORTS['application-service']}/api/v1`;

describe('Application Controller (E2E)', () => {
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
      .stores('app_employer_token', 'accessToken');

    // Create employer profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/employers/profile`)
        .withHeaders('Authorization', 'Bearer $S{app_employer_token}')
        .withJson(generateEmployerProfile())
        .expectStatus(201);
    } catch (e) {
      // Profile may already exist
    }

    // Create and publish a job
    await spec()
      .post(`${JOB_BASE_URL}/jobs`)
      .withHeaders('Authorization', 'Bearer $S{app_employer_token}')
      .withJson(generateJob())
      .expectStatus(201)
      .stores('app_jobId', 'id');

    await spec()
      .post(`${JOB_BASE_URL}/jobs/$S{app_jobId}/publish`)
      .withHeaders('Authorization', 'Bearer $S{app_employer_token}')
      .withJson({})
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });

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
      .stores('app_candidate_token', 'accessToken');

    // Create candidate profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/candidates/profile`)
        .withHeaders('Authorization', 'Bearer $S{app_candidate_token}')
        .withJson(generateCandidateProfile())
        .expectStatus(201);
    } catch (e) {
      // Profile may already exist
    }
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('POST /applications', () => {
    it('should create application for job', async () => {
      await spec()
        .post(`${APP_BASE_URL}/applications`)
        .withHeaders('Authorization', 'Bearer $S{app_candidate_token}')
        .withJson({
          jobId: '$S{app_jobId}',
          coverLetter: faker.lorem.paragraphs(2),
        })
        .expectStatus(201)
        .stores('applicationId', 'id');
    });

    it('should fail without auth token', async () => {
      await spec()
        .post(`${APP_BASE_URL}/applications`)
        .withJson({ jobId: '$S{app_jobId}' })
        .expectStatus(401);
    });
  });

  describe('GET /applications/:id', () => {
    it('should get application by ID', async () => {
      await spec()
        .get(`${APP_BASE_URL}/applications/$S{applicationId}`)
        .withHeaders('Authorization', 'Bearer $S{app_candidate_token}')
        .expectStatus(200);
    });
  });

  describe('GET /applications/my-applications', () => {
    it('should get candidate applications', async () => {
      await spec()
        .get(`${APP_BASE_URL}/applications/my-applications`)
        .withHeaders('Authorization', 'Bearer $S{app_candidate_token}')
        .expectStatus(200);
    });
  });

  describe('GET /applications/job/:jobId', () => {
    it('should get applications for job (employer)', async () => {
      await spec()
        .get(`${APP_BASE_URL}/applications/job/$S{app_jobId}`)
        .withHeaders('Authorization', 'Bearer $S{app_employer_token}')
        .expectStatus(200);
    });
  });

  describe('PUT /applications/:id/status', () => {
    it('should update application status (employer)', async () => {
      await spec()
        .put(`${APP_BASE_URL}/applications/$S{applicationId}/status`)
        .withHeaders('Authorization', 'Bearer $S{app_employer_token}')
        .withJson({
          status: 'shortlisted',
          note: 'Strong candidate',
        })
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('POST /applications/:id/notes', () => {
    it('should add note to application (employer)', async () => {
      await spec()
        .post(`${APP_BASE_URL}/applications/$S{applicationId}/notes`)
        .withHeaders('Authorization', 'Bearer $S{app_employer_token}')
        .withJson({
          content: 'Schedule interview next week',
        })
        .expect((ctx) => {
          // Accept 200 or 201
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('POST /applications/:id/withdraw', () => {
    it('should withdraw application (candidate)', async () => {
      // Create a new job and application to withdraw
      await spec()
        .post(`${JOB_BASE_URL}/jobs`)
        .withHeaders('Authorization', 'Bearer $S{app_employer_token}')
        .withJson(generateJob())
        .expectStatus(201)
        .stores('withdraw_jobId', 'id');

      await spec()
        .post(`${JOB_BASE_URL}/jobs/$S{withdraw_jobId}/publish`)
        .withHeaders('Authorization', 'Bearer $S{app_employer_token}')
        .withJson({})
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });

      await spec()
        .post(`${APP_BASE_URL}/applications`)
        .withHeaders('Authorization', 'Bearer $S{app_candidate_token}')
        .withJson({
          jobId: '$S{withdraw_jobId}',
          coverLetter: 'Test application to withdraw',
        })
        .expectStatus(201)
        .stores('withdrawAppId', 'id');

      await spec()
        .post(`${APP_BASE_URL}/applications/$S{withdrawAppId}/withdraw`)
        .withHeaders('Authorization', 'Bearer $S{app_candidate_token}')
        .withJson({})
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });
});
