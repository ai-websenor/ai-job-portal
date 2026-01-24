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

describe('Hiring Pipeline Workflow (E2E)', () => {
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
      .stores('pipeline_employer_token', 'accessToken');

    // Create employer profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/employers/profile`)
        .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
        .withJson(generateEmployerProfile())
        .expectStatus(201);
    } catch (e) {}

    // Create and publish a job
    await spec()
      .post(`${JOB_BASE_URL}/jobs`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
      .withJson(generateJob())
      .expectStatus(201)
      .stores('pipeline_jobId', 'id');

    await spec()
      .post(`${JOB_BASE_URL}/jobs/$S{pipeline_jobId}/publish`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
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
      .stores('pipeline_candidate_token', 'accessToken');

    // Create candidate profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/candidates/profile`)
        .withHeaders('Authorization', 'Bearer $S{pipeline_candidate_token}')
        .withJson(generateCandidateProfile())
        .expectStatus(201);
    } catch (e) {}
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  it('should complete full hiring pipeline: apply → shortlist → interview → offer → accept', async () => {
    // Step 1: Candidate applies
    await spec()
      .post(`${APP_BASE_URL}/applications`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_candidate_token}')
      .withJson({
        jobId: '$S{pipeline_jobId}',
        coverLetter: faker.lorem.paragraphs(2),
      })
      .expectStatus(201)
      .stores('pipeline_appId', 'id');

    // Step 2: Employer shortlists
    await spec()
      .put(`${APP_BASE_URL}/applications/$S{pipeline_appId}/status`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
      .withJson({
        status: 'shortlisted',
        note: 'Strong profile',
      })
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });

    // Step 3: Schedule interview
    const interviewDate = new Date();
    interviewDate.setDate(interviewDate.getDate() + 7);

    await spec()
      .post(`${APP_BASE_URL}/interviews`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
      .withJson({
        applicationId: '$S{pipeline_appId}',
        type: 'video',
        scheduledAt: interviewDate.toISOString(),
        duration: 60,
        meetingLink: 'https://meet.example.com/interview-123',
      })
      .expectStatus(201)
      .stores('pipeline_interviewId', 'id');

    // Step 4: Update application status to interview_scheduled
    await spec()
      .put(`${APP_BASE_URL}/applications/$S{pipeline_appId}/status`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
      .withJson({
        status: 'interview_scheduled',
      })
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });

    // Step 5: Complete interview with feedback
    await spec()
      .post(`${APP_BASE_URL}/interviews/$S{pipeline_interviewId}/feedback`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
      .withJson({
        rating: 5,
        technicalSkills: 5,
        communication: 5,
        cultureFit: 5,
        recommendation: 'hire',
        notes: 'Excellent candidate',
      })
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });

    await spec()
      .post(`${APP_BASE_URL}/interviews/$S{pipeline_interviewId}/complete`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
      .withJson({})
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });

    // Step 6: Create offer
    const offerExpiry = new Date();
    offerExpiry.setDate(offerExpiry.getDate() + 14);
    const joiningDate = new Date();
    joiningDate.setMonth(joiningDate.getMonth() + 1);

    await spec()
      .post(`${APP_BASE_URL}/offers`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
      .withJson({
        applicationId: '$S{pipeline_appId}',
        salary: 130000,
        currency: 'USD',
        joiningDate: joiningDate.toISOString(),
        expiresAt: offerExpiry.toISOString(),
        additionalBenefits: 'Health, 401k, Stock',
      })
      .expectStatus(201)
      .stores('pipeline_offerId', 'applicationId');

    // Step 7: Candidate accepts offer
    await spec()
      .post(`${APP_BASE_URL}/offers/$S{pipeline_offerId}/accept`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_candidate_token}')
      .withJson({})
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });

    // Step 8: Final verification - check application is accessible
    await spec()
      .get(`${APP_BASE_URL}/applications/$S{pipeline_appId}`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_candidate_token}')
      .expectStatus(200);
  });

  it('should handle rejection flow', async () => {
    // Create a new job for rejection test
    await spec()
      .post(`${JOB_BASE_URL}/jobs`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
      .withJson(generateJob())
      .expectStatus(201)
      .stores('reject_jobId', 'id');

    await spec()
      .post(`${JOB_BASE_URL}/jobs/$S{reject_jobId}/publish`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
      .withJson({})
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });

    // Apply
    await spec()
      .post(`${APP_BASE_URL}/applications`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_candidate_token}')
      .withJson({
        jobId: '$S{reject_jobId}',
        coverLetter: 'Test application',
      })
      .expectStatus(201)
      .stores('reject_appId', 'id');

    // Reject
    await spec()
      .put(`${APP_BASE_URL}/applications/$S{reject_appId}/status`)
      .withHeaders('Authorization', 'Bearer $S{pipeline_employer_token}')
      .withJson({
        status: 'rejected',
        note: 'Position requirements changed',
      })
      .expect((ctx) => {
        if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
          throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
        }
      });
  });
});
