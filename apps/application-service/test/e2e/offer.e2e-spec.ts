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

describe('Offer Controller (E2E)', () => {
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
    } catch (e) {}

    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({
        email: employer.email,
        password: employer.password,
      })
      .expectStatus(200)
      .stores('offer_employer_token', 'accessToken');

    // Create employer profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/employers/profile`)
        .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
        .withJson(generateEmployerProfile())
        .expectStatus(201);
    } catch (e) {}

    // Create and publish a job
    await spec()
      .post(`${JOB_BASE_URL}/jobs`)
      .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
      .withJson(generateJob())
      .expectStatus(201)
      .stores('offer_jobId', 'id');

    await spec()
      .post(`${JOB_BASE_URL}/jobs/$S{offer_jobId}/publish`)
      .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
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
    } catch (e) {}

    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({
        email: candidate.email,
        password: candidate.password,
      })
      .expectStatus(200)
      .stores('offer_candidate_token', 'accessToken');

    // Create candidate profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/candidates/profile`)
        .withHeaders('Authorization', 'Bearer $S{offer_candidate_token}')
        .withJson(generateCandidateProfile())
        .expectStatus(201);
    } catch (e) {}

    // Create an application for offer tests
    await spec()
      .post(`${APP_BASE_URL}/applications`)
      .withHeaders('Authorization', 'Bearer $S{offer_candidate_token}')
      .withJson({
        jobId: '$S{offer_jobId}',
        coverLetter: faker.lorem.paragraph(),
      })
      .expectStatus(201)
      .stores('offer_applicationId', 'id');

    // Shortlist the application
    await spec()
      .put(`${APP_BASE_URL}/applications/$S{offer_applicationId}/status`)
      .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
      .withJson({
        status: 'shortlisted',
      })
      .expectStatus(200);
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('POST /offers', () => {
    it('should create job offer (employer)', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 14);
      const joiningDate = new Date();
      joiningDate.setMonth(joiningDate.getMonth() + 1);

      await spec()
        .post(`${APP_BASE_URL}/offers`)
        .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
        .withJson({
          applicationId: '$S{offer_applicationId}',
          salary: 120000,
          currency: 'USD',
          joiningDate: joiningDate.toISOString(),
          expiresAt: expiryDate.toISOString(),
          additionalBenefits: 'Health Insurance, 401k, Stock Options',
        })
        .expectStatus(201)
        .stores('offerId', 'applicationId');
    });
  });

  describe('GET /offers/:id', () => {
    it('should get offer by ID', async () => {
      await spec()
        .get(`${APP_BASE_URL}/offers/$S{offerId}`)
        .withHeaders('Authorization', 'Bearer $S{offer_candidate_token}')
        .expectStatus(200);
    });
  });

  describe('POST /offers/:id/accept', () => {
    it('should accept offer (candidate)', async () => {
      await spec()
        .post(`${APP_BASE_URL}/offers/$S{offerId}/accept`)
        .withHeaders('Authorization', 'Bearer $S{offer_candidate_token}')
        .withJson({})
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('POST /offers/:id/decline', () => {
    it('should decline offer (candidate)', async () => {
      // Create new job and application for decline test
      await spec()
        .post(`${JOB_BASE_URL}/jobs`)
        .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
        .withJson(generateJob())
        .expectStatus(201)
        .stores('decline_jobId', 'id');

      await spec()
        .post(`${JOB_BASE_URL}/jobs/$S{decline_jobId}/publish`)
        .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
        .withJson({})
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });

      await spec()
        .post(`${APP_BASE_URL}/applications`)
        .withHeaders('Authorization', 'Bearer $S{offer_candidate_token}')
        .withJson({
          jobId: '$S{decline_jobId}',
          coverLetter: 'Test application',
        })
        .expectStatus(201)
        .stores('decline_appId', 'id');

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 14);
      const joiningDate = new Date();
      joiningDate.setMonth(joiningDate.getMonth() + 1);

      await spec()
        .post(`${APP_BASE_URL}/offers`)
        .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
        .withJson({
          applicationId: '$S{decline_appId}',
          salary: 100000,
          currency: 'USD',
          joiningDate: joiningDate.toISOString(),
          expiresAt: expiryDate.toISOString(),
        })
        .expectStatus(201)
        .stores('declineOfferId', 'applicationId');

      await spec()
        .post(`${APP_BASE_URL}/offers/$S{declineOfferId}/decline`)
        .withHeaders('Authorization', 'Bearer $S{offer_candidate_token}')
        .withJson({
          reason: 'Accepted another opportunity',
        })
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('POST /offers/:id/withdraw', () => {
    it('should withdraw offer (employer)', async () => {
      // Create new job and application for withdraw test
      await spec()
        .post(`${JOB_BASE_URL}/jobs`)
        .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
        .withJson(generateJob())
        .expectStatus(201)
        .stores('withdraw_offer_jobId', 'id');

      await spec()
        .post(`${JOB_BASE_URL}/jobs/$S{withdraw_offer_jobId}/publish`)
        .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
        .withJson({})
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });

      await spec()
        .post(`${APP_BASE_URL}/applications`)
        .withHeaders('Authorization', 'Bearer $S{offer_candidate_token}')
        .withJson({
          jobId: '$S{withdraw_offer_jobId}',
          coverLetter: 'Test application',
        })
        .expectStatus(201)
        .stores('withdraw_offer_appId', 'id');

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 14);
      const joiningDate = new Date();
      joiningDate.setMonth(joiningDate.getMonth() + 1);

      await spec()
        .post(`${APP_BASE_URL}/offers`)
        .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
        .withJson({
          applicationId: '$S{withdraw_offer_appId}',
          salary: 90000,
          currency: 'USD',
          joiningDate: joiningDate.toISOString(),
          expiresAt: expiryDate.toISOString(),
        })
        .expectStatus(201)
        .stores('withdrawOfferId', 'applicationId');

      await spec()
        .post(`${APP_BASE_URL}/offers/$S{withdrawOfferId}/withdraw`)
        .withHeaders('Authorization', 'Bearer $S{offer_employer_token}')
        .withJson({
          reason: 'Position filled internally',
        })
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });
});
