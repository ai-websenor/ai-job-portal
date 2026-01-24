import { spec, stash } from 'pactum';
import {
  generateCandidate,
  generateEmployer,
  generateCandidateProfile,
  generateEmployerProfile,
  SERVICE_PORTS,
} from '@ai-job-portal/testing';

const AUTH_BASE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;
const USER_BASE_URL = process.env.USER_SERVICE_URL || `http://localhost:${SERVICE_PORTS['user-service']}/api/v1`;
const MSG_BASE_URL = process.env.MESSAGING_SERVICE_URL
  ? `${process.env.MESSAGING_SERVICE_URL}/api/v1`
  : `http://localhost:${SERVICE_PORTS['messaging-service']}/api/v1`;

describe('Thread-Messages Relationship (1:N)', () => {
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
        .stores('rel_candidate_id', 'userId');
    } catch (e) {}

    // Login candidate (get token from login)
    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({
        email: candidate.email,
        password: candidate.password,
      })
      .expectStatus(200)
      .stores('rel_candidate_token', 'accessToken');

    // Create candidate profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/candidates/profile`)
        .withHeaders('Authorization', 'Bearer $S{rel_candidate_token}')
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
        .stores('rel_employer_id', 'userId');
    } catch (e) {}

    // Login employer (get token from login)
    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({
        email: employer.email,
        password: employer.password,
      })
      .expectStatus(200)
      .stores('rel_employer_token', 'accessToken');

    // Create employer profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/employers/profile`)
        .withHeaders('Authorization', 'Bearer $S{rel_employer_token}')
        .withJson(generateEmployerProfile())
        .expectStatus(201);
    } catch (e) {}
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('Adding multiple messages to thread', () => {
    it('should create thread with initial message', async () => {
      await spec()
        .post(`${MSG_BASE_URL}/messages/threads`)
        .withHeaders('Authorization', 'Bearer $S{rel_candidate_token}')
        .withJson({
          recipientId: '$S{rel_employer_id}',
          subject: 'Test conversation',
          body: 'Message 1',
        })
        .expectStatus(201)
        .stores('rel_threadId', 'thread.id');
    });

    it('should add multiple messages to thread', async () => {
      for (let i = 2; i <= 5; i++) {
        await spec()
          .post(`${MSG_BASE_URL}/messages/threads/$S{rel_threadId}/messages`)
          .withHeaders('Authorization', 'Bearer $S{rel_candidate_token}')
          .withJson({
            body: `Message ${i}`,
          })
          .expectStatus(201);
      }
    });

    it('should retrieve all messages in thread', async () => {
      await spec()
        .get(`${MSG_BASE_URL}/messages/threads/$S{rel_threadId}/messages`)
        .withHeaders('Authorization', 'Bearer $S{rel_candidate_token}')
        .expectStatus(200)
        .expect((ctx) => {
          // Allow for different response structures
          const body = ctx.res.body;
          const messages = Array.isArray(body) ? body : body.data || body.messages || [];
          if (messages.length < 5) {
            throw new Error(`Expected at least 5 messages, got ${messages.length}`);
          }
        });
    });

    it('should return messages in reverse chronological order (newest first)', async () => {
      await spec()
        .get(`${MSG_BASE_URL}/messages/threads/$S{rel_threadId}/messages`)
        .withHeaders('Authorization', 'Bearer $S{rel_candidate_token}')
        .expectStatus(200)
        .expect((ctx) => {
          const body = ctx.res.body;
          const messages = Array.isArray(body) ? body : body.data || body.messages || [];
          // Messages are sorted DESC (newest first)
          for (let i = 1; i < messages.length; i++) {
            const prevDate = new Date(messages[i - 1].createdAt);
            const currDate = new Date(messages[i].createdAt);
            if (currDate > prevDate) {
              throw new Error('Messages not in reverse chronological order (expected newest first)');
            }
          }
        });
    });

    it('should update thread lastMessageAt on new message', async () => {
      const beforeMessage = await spec()
        .get(`${MSG_BASE_URL}/messages/threads/$S{rel_threadId}`)
        .withHeaders('Authorization', 'Bearer $S{rel_candidate_token}')
        .expectStatus(200)
        .returns('lastMessageAt');

      await spec()
        .post(`${MSG_BASE_URL}/messages/threads/$S{rel_threadId}/messages`)
        .withHeaders('Authorization', 'Bearer $S{rel_candidate_token}')
        .withJson({
          body: 'New message',
        })
        .expectStatus(201);

      await spec()
        .get(`${MSG_BASE_URL}/messages/threads/$S{rel_threadId}`)
        .withHeaders('Authorization', 'Bearer $S{rel_candidate_token}')
        .expectStatus(200)
        .expect((ctx) => {
          const afterMessage = ctx.res.body.lastMessageAt || ctx.res.body.updatedAt;
          if (beforeMessage && afterMessage && new Date(afterMessage) <= new Date(beforeMessage)) {
            throw new Error('lastMessageAt not updated');
          }
        });
    });
  });
});
