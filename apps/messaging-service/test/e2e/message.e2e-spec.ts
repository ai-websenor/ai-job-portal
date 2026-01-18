import { spec, stash } from 'pactum';
import {
  generateCandidate,
  generateEmployer,
  generateCandidateProfile,
  generateEmployerProfile,
  SERVICE_PORTS,
  faker,
} from '@ai-job-portal/testing';

const AUTH_BASE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;
const USER_BASE_URL = process.env.USER_SERVICE_URL || `http://localhost:${SERVICE_PORTS['user-service']}/api/v1`;
const MSG_BASE_URL = process.env.MESSAGING_SERVICE_URL
  ? `${process.env.MESSAGING_SERVICE_URL}/api/v1`
  : `http://localhost:${SERVICE_PORTS['messaging-service']}/api/v1`;

describe('Message Controller (E2E)', () => {
  const candidate = generateCandidate();
  const employer = generateEmployer();

  beforeAll(async () => {
    // Register candidate (get userId from register)
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
        .expectStatus(201)
        .stores('msg2_candidate_id', 'userId');
    } catch (e) {}

    // Login candidate (get token from login)
    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({
        email: candidate.email,
        password: candidate.password,
      })
      .expectStatus(200)
      .stores('msg2_candidate_token', 'accessToken');

    // Create candidate profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/candidates/profile`)
        .withHeaders('Authorization', 'Bearer $S{msg2_candidate_token}')
        .withJson(generateCandidateProfile())
        .expectStatus(201);
    } catch (e) {}

    // Register employer (get userId from register)
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
        .expectStatus(201)
        .stores('msg2_employer_id', 'userId');
    } catch (e) {}

    // Login employer (get token from login)
    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({
        email: employer.email,
        password: employer.password,
      })
      .expectStatus(200)
      .stores('msg2_employer_token', 'accessToken');

    // Create employer profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/employers/profile`)
        .withHeaders('Authorization', 'Bearer $S{msg2_employer_token}')
        .withJson(generateEmployerProfile())
        .expectStatus(201);
    } catch (e) {}

    // Create a thread for message tests
    await spec()
      .post(`${MSG_BASE_URL}/messages/threads`)
      .withHeaders('Authorization', 'Bearer $S{msg2_candidate_token}')
      .withJson({
        recipientId: '$S{msg2_employer_id}',
        subject: 'Test thread for messages',
        body: 'Initial message',
      })
      .expectStatus(201)
      .stores('msg2_threadId', 'thread.id');
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('POST /messages/threads/:threadId/messages', () => {
    it('should send message in thread', async () => {
      await spec()
        .post(`${MSG_BASE_URL}/messages/threads/$S{msg2_threadId}/messages`)
        .withHeaders('Authorization', 'Bearer $S{msg2_candidate_token}')
        .withJson({
          body: 'This is a follow-up message',
        })
        .expectStatus(201)
        .stores('messageId', 'id');
    });
  });

  describe('GET /messages/threads/:threadId/messages', () => {
    it('should get messages in thread', async () => {
      await spec()
        .get(`${MSG_BASE_URL}/messages/threads/$S{msg2_threadId}/messages`)
        .withHeaders('Authorization', 'Bearer $S{msg2_candidate_token}')
        .expectStatus(200);
    });

    it('should paginate messages', async () => {
      await spec()
        .get(`${MSG_BASE_URL}/messages/threads/$S{msg2_threadId}/messages`)
        .withHeaders('Authorization', 'Bearer $S{msg2_candidate_token}')
        .withQueryParams({ page: 1, limit: 50 })
        .expectStatus(200);
    });
  });

  describe('POST /messages/mark-read', () => {
    it('should mark specific messages as read', async () => {
      await spec()
        .post(`${MSG_BASE_URL}/messages/mark-read`)
        .withHeaders('Authorization', 'Bearer $S{msg2_employer_token}')
        .withJson({
          messageIds: ['$S{messageId}'],
        })
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('POST /messages/threads/:threadId/mark-read', () => {
    it('should mark all thread messages as read', async () => {
      await spec()
        .post(`${MSG_BASE_URL}/messages/threads/$S{msg2_threadId}/mark-read`)
        .withHeaders('Authorization', 'Bearer $S{msg2_employer_token}')
        .withJson({})
        .expect((ctx) => {
          if (ctx.res.statusCode !== 200 && ctx.res.statusCode !== 201) {
            throw new Error(`Expected 200 or 201, got ${ctx.res.statusCode}`);
          }
        });
    });
  });

  describe('GET /messages/unread/count', () => {
    it('should get unread message count', async () => {
      await spec()
        .get(`${MSG_BASE_URL}/messages/unread/count`)
        .withHeaders('Authorization', 'Bearer $S{msg2_candidate_token}')
        .expectStatus(200);
    });
  });
});
