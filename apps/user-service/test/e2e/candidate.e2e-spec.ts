import { spec, stash } from 'pactum';
import {
  generateCandidate,
  generateCandidateProfile,
  generateExperience,
  generateEducation,
  SERVICE_PORTS,
} from '@ai-job-portal/testing';

const AUTH_BASE_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;

describe('Candidate Controller (E2E)', () => {
  const testUser = generateCandidate();

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
      .stores('candidate_token', 'accessToken');
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('POST /candidates/profile', () => {
    it('should create candidate profile', async () => {
      const profile = generateCandidateProfile();
      await spec()
        .post('/candidates/profile')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson(profile)
        .expectStatus(201)
        .stores('candidateProfileId', 'id');
    });

    it('should fail without auth token', async () => {
      await spec()
        .post('/candidates/profile')
        .withJson(generateCandidateProfile())
        .expectStatus(401);
    });
  });

  describe('GET /candidates/profile', () => {
    it('should get candidate profile', async () => {
      await spec()
        .get('/candidates/profile')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .expectStatus(200)
        .expectJsonLike({
          id: /.+/,
        });
    });
  });

  describe('PUT /candidates/profile', () => {
    it('should update candidate profile', async () => {
      await spec()
        .put('/candidates/profile')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson({
          headline: 'Updated Senior Developer',
          summary: 'Updated summary with more experience',
        })
        .expectStatus(200);
    });
  });

  describe('Work Experience CRUD', () => {
    it('should add work experience', async () => {
      const experience = generateExperience();
      await spec()
        .post('/candidates/experiences')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson(experience)
        .expectStatus(201)
        .expectJsonLike({
          companyName: experience.companyName,
        })
        .stores('experienceId', 'id');
    });

    it('should get all experiences', async () => {
      await spec()
        .get('/candidates/experiences')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
        });
    });

    it('should get experience by ID', async () => {
      await spec()
        .get('/candidates/experiences/$S{experienceId}')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .expectStatus(200)
        .expectJsonLike({
          id: '$S{experienceId}',
        });
    });

    it('should update experience', async () => {
      await spec()
        .put('/candidates/experiences/$S{experienceId}')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson({
          title: 'Updated Job Title',
        })
        .expectStatus(200);
    });

    it('should delete experience', async () => {
      // First add another experience to delete
      await spec()
        .post('/candidates/experiences')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson(generateExperience())
        .expectStatus(201)
        .stores('expToDelete', 'id');

      await spec()
        .delete('/candidates/experiences/$S{expToDelete}')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson({})
        .expectStatus(200);
    });
  });

  describe('Education CRUD', () => {
    it('should add education', async () => {
      const education = generateEducation();
      await spec()
        .post('/candidates/education')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson(education)
        .expectStatus(201)
        .expectJsonLike({
          degree: education.degree,
        })
        .stores('educationId', 'id');
    });

    it('should get all education records', async () => {
      await spec()
        .get('/candidates/education')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
        });
    });

    it('should get education by ID', async () => {
      await spec()
        .get('/candidates/education/$S{educationId}')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .expectStatus(200)
        .expectJsonLike({
          id: '$S{educationId}',
        });
    });

    it('should update education', async () => {
      await spec()
        .put('/candidates/education/$S{educationId}')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson({
          degree: 'Master of Science',
        })
        .expectStatus(200);
    });

    it('should delete education', async () => {
      // First add another education to delete
      await spec()
        .post('/candidates/education')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson(generateEducation())
        .expectStatus(201)
        .stores('eduToDelete', 'id');

      await spec()
        .delete('/candidates/education/$S{eduToDelete}')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson({})
        .expectStatus(200);
    });
  });

  describe('GET /candidates/profile-views', () => {
    it('should get profile views', async () => {
      await spec()
        .get('/candidates/profile-views')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .expectStatus(200);
    });

    it('should get profile views with pagination', async () => {
      await spec()
        .get('/candidates/profile-views')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withQueryParams({ page: 1, limit: 10 })
        .expectStatus(200);
    });
  });
});
