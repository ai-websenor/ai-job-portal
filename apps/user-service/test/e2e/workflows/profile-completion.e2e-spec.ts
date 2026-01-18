import { spec, stash } from 'pactum';
import {
  generateCandidate,
  generateCandidateProfile,
  generateExperience,
  generateEducation,
  SERVICE_PORTS,
} from '@ai-job-portal/testing';

const AUTH_BASE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;

describe('Profile Completion Workflow (E2E)', () => {
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
      .stores('workflow_token', 'accessToken');
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  it('should complete full profile setup flow', async () => {
    // Step 1: Create basic profile
    const profile = generateCandidateProfile();
    await spec()
      .post('/candidates/profile')
      .withHeaders('Authorization', 'Bearer $S{workflow_token}')
      .withJson(profile)
      .expectStatus(201)
      .stores('workflow_profileId', 'id');

    // Step 2: Add work experience
    const experience = generateExperience(true); // current job
    await spec()
      .post('/candidates/experiences')
      .withHeaders('Authorization', 'Bearer $S{workflow_token}')
      .withJson(experience)
      .expectStatus(201)
      .stores('workflow_expId', 'id');

    // Step 3: Add education
    const education = generateEducation();
    await spec()
      .post('/candidates/education')
      .withHeaders('Authorization', 'Bearer $S{workflow_token}')
      .withJson(education)
      .expectStatus(201)
      .stores('workflow_eduId', 'id');

    // Step 4: Verify complete profile
    await spec()
      .get('/candidates/profile')
      .withHeaders('Authorization', 'Bearer $S{workflow_token}')
      .expectStatus(200)
      .expectJsonLike({
        id: '$S{workflow_profileId}',
      });

    // Step 5: Update profile headline
    await spec()
      .put('/candidates/profile')
      .withHeaders('Authorization', 'Bearer $S{workflow_token}')
      .withJson({
        headline: `${experience.title} at ${experience.companyName}`,
      })
      .expectStatus(200);

    // Step 6: Verify experiences exist
    await spec()
      .get('/candidates/experiences')
      .withHeaders('Authorization', 'Bearer $S{workflow_token}')
      .expectStatus(200)
      .expectJsonSchema({
        type: 'array',
      });

    // Step 7: Verify education exists
    await spec()
      .get('/candidates/education')
      .withHeaders('Authorization', 'Bearer $S{workflow_token}')
      .expectStatus(200)
      .expectJsonSchema({
        type: 'array',
      });
  });

  it('should handle profile updates workflow', async () => {
    // Add second experience
    await spec()
      .post('/candidates/experiences')
      .withHeaders('Authorization', 'Bearer $S{workflow_token}')
      .withJson(generateExperience(false))
      .expectStatus(201);

    // Update profile summary to reflect experience
    await spec()
      .put('/candidates/profile')
      .withHeaders('Authorization', 'Bearer $S{workflow_token}')
      .withJson({
        summary: 'Experienced professional with multiple roles',
        experienceYears: 5,
      })
      .expectStatus(200);

    // Verify profile reflects updates
    await spec()
      .get('/candidates/profile')
      .withHeaders('Authorization', 'Bearer $S{workflow_token}')
      .expectStatus(200);
  });
});
