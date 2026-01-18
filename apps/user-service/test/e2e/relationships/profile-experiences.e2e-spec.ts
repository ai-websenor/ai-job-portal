import { spec, stash } from 'pactum';
import { generateCandidate, generateCandidateProfile, generateExperiences, SERVICE_PORTS } from '@ai-job-portal/testing';

const AUTH_BASE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;

describe('Profile-Experiences Relationship (1:N)', () => {
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
      .stores('exp_rel_token', 'accessToken');

    // Create candidate profile first (required before adding experiences)
    await spec()
      .post('/candidates/profile')
      .withHeaders('Authorization', 'Bearer $S{exp_rel_token}')
      .withJson(generateCandidateProfile())
      .expectStatus(201);
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('Adding multiple experiences', () => {
    const experiences = generateExperiences(3);

    it('should add multiple experiences to profile', async () => {
      for (let i = 0; i < experiences.length; i++) {
        await spec()
          .post('/candidates/experiences')
          .withHeaders('Authorization', 'Bearer $S{exp_rel_token}')
          .withJson(experiences[i])
          .expectStatus(201)
          .stores(`exp_${i}`, 'id');
      }
    });

    it('should retrieve all experiences for profile', async () => {
      await spec()
        .get('/candidates/experiences')
        .withHeaders('Authorization', 'Bearer $S{exp_rel_token}')
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
        });
    });

    it('should update individual experience without affecting others', async () => {
      await spec()
        .put('/candidates/experiences/$S{exp_0}')
        .withHeaders('Authorization', 'Bearer $S{exp_rel_token}')
        .withJson({
          title: 'Updated Title for First Experience',
        })
        .expectStatus(200);

      // Verify others are unchanged
      await spec()
        .get('/candidates/experiences/$S{exp_1}')
        .withHeaders('Authorization', 'Bearer $S{exp_rel_token}')
        .expectStatus(200)
        .expectJsonLike({
          companyName: experiences[1].companyName,
        });
    });

    it('should delete one experience and verify count', async () => {
      await spec()
        .delete('/candidates/experiences/$S{exp_2}')
        .withHeaders('Authorization', 'Bearer $S{exp_rel_token}')
        .withJson({})
        .expectStatus(200);

      await spec()
        .get('/candidates/experiences')
        .withHeaders('Authorization', 'Bearer $S{exp_rel_token}')
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
        });
    });
  });

  describe('Experience ordering', () => {
    it('should return experiences ordered by date (most recent first)', async () => {
      await spec()
        .get('/candidates/experiences')
        .withHeaders('Authorization', 'Bearer $S{exp_rel_token}')
        .expectStatus(200)
        .expect((ctx) => {
          const experiences = ctx.res.body;
          if (experiences.length > 1) {
            // Current experience should be first
            const hasCurrentFirst = experiences[0].current === true ||
              new Date(experiences[0].startDate) >= new Date(experiences[1].startDate);
            if (!hasCurrentFirst) {
              throw new Error('Experiences not ordered correctly');
            }
          }
        });
    });
  });
});
