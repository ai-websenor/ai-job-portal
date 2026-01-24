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

describe('Interview Controller (E2E)', () => {
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
      .stores('int_employer_token', 'accessToken');

    // Create employer profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/employers/profile`)
        .withHeaders('Authorization', 'Bearer $S{int_employer_token}')
        .withJson(generateEmployerProfile())
        .expectStatus(201);
    } catch (e) {}

    // Create and publish a job
    await spec()
      .post(`${JOB_BASE_URL}/jobs`)
      .withHeaders('Authorization', 'Bearer $S{int_employer_token}')
      .withJson(generateJob())
      .expectStatus(201)
      .stores('int_jobId', 'id');

    await spec()
      .post(`${JOB_BASE_URL}/jobs/$S{int_jobId}/publish`)
      .withHeaders('Authorization', 'Bearer $S{int_employer_token}')
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
      .stores('int_candidate_token', 'accessToken');

    // Create candidate profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/candidates/profile`)
        .withHeaders('Authorization', 'Bearer $S{int_candidate_token}')
        .withJson(generateCandidateProfile())
        .expectStatus(201);
    } catch (e) {}

    // Create an application for interview tests
    await spec()
      .post(`${APP_BASE_URL}/applications`)
      .withHeaders('Authorization', 'Bearer $S{int_candidate_token}')
      .withJson({
        jobId: '$S{int_jobId}',
        coverLetter: faker.lorem.paragraph(),
      })
      .expectStatus(201)
      .stores('int_applicationId', 'id');
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('POST /interviews', () => {
    it('should schedule interview (employer)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await spec()
        .post(`${APP_BASE_URL}/interviews`)
        .withHeaders('Authorization', 'Bearer $S{int_employer_token}')
        .withJson({
          applicationId: '$S{int_applicationId}',
          type: 'video',
          scheduledAt: futureDate.toISOString(),
          duration: 60,
          meetingLink: 'https://meet.example.com/interview',
        })
        .expectStatus(201)
        .stores('interviewId', 'id');
    });
  });

  describe('GET /interviews/:id', () => {
    it('should get interview by ID', async () => {
      await spec()
        .get(`${APP_BASE_URL}/interviews/$S{interviewId}`)
        .withHeaders('Authorization', 'Bearer $S{int_employer_token}')
        .expectStatus(200);
    });
  });

  describe('PUT /interviews/:id', () => {
    it('should reschedule interview', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 14);

      await spec()
        .put(`${APP_BASE_URL}/interviews/$S{interviewId}`)
        .withHeaders('Authorization', 'Bearer $S{int_employer_token}')
        .withJson({
          scheduledAt: newDate.toISOString(),
        })
        .expectStatus(200);
    });
  });

  describe('POST /interviews/:id/feedback', () => {
    it('should add interview feedback', async () => {
      await spec()
        .post(`${APP_BASE_URL}/interviews/$S{interviewId}/feedback`)
        .withHeaders('Authorization', 'Bearer $S{int_employer_token}')
        .withJson({
          rating: 4,
          technicalSkills: 4,
          communication: 5,
          cultureFit: 4,
          notes: faker.lorem.paragraph(),
          recommendation: 'hire',
        })
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('POST /interviews/:id/complete', () => {
    it('should mark interview as complete', async () => {
      await spec()
        .post(`${APP_BASE_URL}/interviews/$S{interviewId}/complete`)
        .withHeaders('Authorization', 'Bearer $S{int_employer_token}')
        .withJson({})
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('POST /interviews/:id/cancel', () => {
    it('should cancel interview', async () => {
      // Create new interview to cancel
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await spec()
        .post(`${APP_BASE_URL}/interviews`)
        .withHeaders('Authorization', 'Bearer $S{int_employer_token}')
        .withJson({
          applicationId: '$S{int_applicationId}',
          type: 'phone',
          scheduledAt: futureDate.toISOString(),
          duration: 30,
        })
        .expectStatus(201)
        .stores('cancelInterviewId', 'id');

      await spec()
        .post(`${APP_BASE_URL}/interviews/$S{cancelInterviewId}/cancel`)
        .withHeaders('Authorization', 'Bearer $S{int_employer_token}')
        .withJson({})
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('GET /interviews/upcoming/list', () => {
    it('should get upcoming interviews', async () => {
      await spec()
        .get(`${APP_BASE_URL}/interviews/upcoming/list`)
        .withHeaders('Authorization', 'Bearer $S{int_employer_token}')
        .expectStatus(200);
    });
  });
});
