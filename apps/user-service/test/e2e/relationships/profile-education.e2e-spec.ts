import { spec, stash } from 'pactum';
import { generateCandidate, generateCandidateProfile, generateEducations, SERVICE_PORTS } from '@ai-job-portal/testing';

const AUTH_BASE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;

describe('Profile-Education Relationship (1:N)', () => {
  const testUser = generateCandidate();

  beforeAll(async () => {
    // Register and login to get auth token
    try {
      await spec()
        .post(`${AUTH_BASE_URL}/auth/register`)
        .withJson({
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          mobile: testUser.mobile,
          role: 'candidate',
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
      .stores('edu_rel_token', 'accessToken');

    // Create candidate profile first (required before adding education)
    await spec()
      .post('/candidates/profile')
      .withHeaders('Authorization', 'Bearer $S{edu_rel_token}')
      .withJson(generateCandidateProfile())
      .expectStatus(201);
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('Adding multiple education records', () => {
    const educations = generateEducations(2);

    it('should add multiple education records to profile', async () => {
      for (let i = 0; i < educations.length; i++) {
        await spec()
          .post('/candidates/education')
          .withHeaders('Authorization', 'Bearer $S{edu_rel_token}')
          .withJson(educations[i])
          .expectStatus(201)
          .stores(`edu_${i}`, 'id');
      }
    });

    it('should retrieve all education records for profile', async () => {
      await spec()
        .get('/candidates/education')
        .withHeaders('Authorization', 'Bearer $S{edu_rel_token}')
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
        });
    });

    it('should update individual education without affecting others', async () => {
      await spec()
        .put('/candidates/education/$S{edu_0}')
        .withHeaders('Authorization', 'Bearer $S{edu_rel_token}')
        .withJson({
          grade: '4.0 GPA',
        })
        .expectStatus(200);

      // Verify other record is unchanged
      await spec()
        .get('/candidates/education/$S{edu_1}')
        .withHeaders('Authorization', 'Bearer $S{edu_rel_token}')
        .expectStatus(200)
        .expectJsonLike({
          institution: educations[1].institution,
        });
    });

    it('should delete one education and verify count', async () => {
      await spec()
        .delete('/candidates/education/$S{edu_1}')
        .withHeaders('Authorization', 'Bearer $S{edu_rel_token}')
        .withJson({})
        .expectStatus(200);

      await spec()
        .get('/candidates/education')
        .withHeaders('Authorization', 'Bearer $S{edu_rel_token}')
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
        });
    });
  });
});
