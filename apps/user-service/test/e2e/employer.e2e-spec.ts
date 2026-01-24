import { spec, stash } from 'pactum';
import { generateEmployer, SERVICE_PORTS } from '@ai-job-portal/testing';

const AUTH_BASE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;

describe('Employer Controller (E2E)', () => {
  const testUser = generateEmployer();

  beforeAll(async () => {
    // Register and login to get auth token from auth-service
    try {
      await spec()
        .post(`${AUTH_BASE_URL}/auth/register`)
        .withJson({
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          mobile: testUser.mobile,
          role: 'employer',
        })
        .expectStatus(201);
    } catch (e) {
      // User may already exist
    }

    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({
        email: testUser.email,
        password: testUser.password,
      })
      .expectStatus(200)
      .stores('employer_token', 'accessToken');
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('POST /employers/profile', () => {
    it('should create employer profile', async () => {
      await spec()
        .post('/employers/profile')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson({
          title: 'HR Manager',
          department: 'Human Resources',
        })
        .expectStatus(201)
        .stores('employerProfileId', 'id');
    });

    it('should fail without auth token', async () => {
      await spec()
        .post('/employers/profile')
        .withJson({
          title: 'HR Manager',
        })
        .expectStatus(401);
    });
  });

  describe('GET /employers/profile', () => {
    it('should get employer profile', async () => {
      await spec()
        .get('/employers/profile')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(200);
    });
  });

  describe('PUT /employers/profile', () => {
    it('should update employer profile', async () => {
      await spec()
        .put('/employers/profile')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson({
          title: 'Senior HR Manager',
        })
        .expectStatus(200);
    });
  });
});
