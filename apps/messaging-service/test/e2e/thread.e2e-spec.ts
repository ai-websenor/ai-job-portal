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

describe('Thread Controller (E2E)', () => {
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
        .stores('msg_candidate_id', 'userId');
    } catch (e) {}

    // Login candidate (get token from login)
    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({
        email: candidate.email,
        password: candidate.password,
      })
      .expectStatus(200)
      .stores('msg_candidate_token', 'accessToken');

    // Create candidate profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/candidates/profile`)
        .withHeaders('Authorization', 'Bearer $S{msg_candidate_token}')
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
        .stores('msg_employer_id', 'userId');
    } catch (e) {}

    // Login employer (get token from login)
    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({
        email: employer.email,
        password: employer.password,
      })
      .expectStatus(200)
      .stores('msg_employer_token', 'accessToken');

    // Create employer profile
    try {
      await spec()
        .post(`${USER_BASE_URL}/employers/profile`)
        .withHeaders('Authorization', 'Bearer $S{msg_employer_token}')
        .withJson(generateEmployerProfile())
        .expectStatus(201);
    } catch (e) {}
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('POST /messages/threads', () => {
    it('should create new thread', async () => {
      await spec()
        .post(`${MSG_BASE_URL}/messages/threads`)
        .withHeaders('Authorization', 'Bearer $S{msg_candidate_token}')
        .withJson({
          recipientId: '$S{msg_employer_id}',
          subject: 'Application inquiry',
          body: 'Hi, I wanted to ask about the position...',
        })
        .expectStatus(201)
        .stores('threadId', 'thread.id');
    });
  });

  describe('GET /messages/threads', () => {
    it('should get user threads', async () => {
      await spec()
        .get(`${MSG_BASE_URL}/messages/threads`)
        .withHeaders('Authorization', 'Bearer $S{msg_candidate_token}')
        .expectStatus(200);
    });

    it('should paginate threads', async () => {
      await spec()
        .get(`${MSG_BASE_URL}/messages/threads`)
        .withHeaders('Authorization', 'Bearer $S{msg_candidate_token}')
        .withQueryParams({ page: 1, limit: 20 })
        .expectStatus(200);
    });
  });

  describe('GET /messages/threads/:id', () => {
    it('should get thread by ID', async () => {
      await spec()
        .get(`${MSG_BASE_URL}/messages/threads/$S{threadId}`)
        .withHeaders('Authorization', 'Bearer $S{msg_candidate_token}')
        .expectStatus(200);
    });
  });

  describe('PUT /messages/threads/:id (archive)', () => {
    it('should archive thread', async () => {
      await spec()
        .put(`${MSG_BASE_URL}/messages/threads/$S{threadId}`)
        .withHeaders('Authorization', 'Bearer $S{msg_candidate_token}')
        .withJson({ isArchived: true })
        .expectStatus(200);
    });
  });

  describe('PUT /messages/threads/:id (unarchive)', () => {
    it('should unarchive thread', async () => {
      await spec()
        .put(`${MSG_BASE_URL}/messages/threads/$S{threadId}`)
        .withHeaders('Authorization', 'Bearer $S{msg_candidate_token}')
        .withJson({ isArchived: false })
        .expectStatus(200);
    });
  });

  describe('DELETE /messages/threads/:id', () => {
    it('should delete thread', async () => {
      // Create thread to delete
      await spec()
        .post(`${MSG_BASE_URL}/messages/threads`)
        .withHeaders('Authorization', 'Bearer $S{msg_candidate_token}')
        .withJson({
          recipientId: '$S{msg_employer_id}',
          subject: 'Thread to delete',
          body: 'This will be deleted',
        })
        .expectStatus(201)
        .stores('deleteThreadId', 'thread.id');

      await spec()
        .delete(`${MSG_BASE_URL}/messages/threads/$S{deleteThreadId}`)
        .withHeaders('Authorization', 'Bearer $S{msg_candidate_token}')
        .expectStatus(200);
    });
  });
});
