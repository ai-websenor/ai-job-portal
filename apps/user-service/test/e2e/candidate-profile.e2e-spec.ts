import { spec, stash } from 'pactum';
import {
  generateCandidate,
  generateEmployer,
  generateCandidateProfile,
  SERVICE_PORTS,
} from '@ai-job-portal/testing';

const AUTH_BASE_URL =
  process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

describe('Candidate Profile by profileId (E2E)', () => {
  const candidateUser = generateCandidate();
  const employerUser = generateEmployer();

  async function registerAndLogin(
    user: { email: string; password: string; firstName: string; lastName: string; mobile: string },
    role: string,
    tokenKey: string,
  ) {
    try {
      await spec()
        .post(`${AUTH_BASE_URL}/auth/register`)
        .withJson({
          email: user.email,
          password: user.password,
          firstName: user.firstName,
          lastName: user.lastName,
          mobile: user.mobile,
          role,
        })
        .expectStatus(201);
    } catch (e) {
      console.log(`Registration failed for ${user.email} (might already exist): ${e}`);
    }

    await spec()
      .post(`${AUTH_BASE_URL}/auth/login`)
      .withJson({ email: user.email, password: user.password })
      .expectStatus(200)
      .stores(tokenKey, 'accessToken');
  }

  beforeAll(async () => {
    // Candidate — registers, logs in, and creates a (public) profile
    await registerAndLogin(candidateUser, 'candidate', 'candidate_token');
    await spec()
      .post('/candidates/profile')
      .withHeaders('Authorization', 'Bearer $S{candidate_token}')
      .withJson(generateCandidateProfile())
      .expectStatus(201)
      .stores('viewProfileId', 'id');

    // Employer — registers, logs in, and creates an employer profile
    await registerAndLogin(employerUser, 'employer', 'employer_token');
    await spec()
      .post('/employers/profile')
      .withHeaders('Authorization', 'Bearer $S{employer_token}')
      .withJson({ title: 'HR Manager', department: 'Human Resources' })
      .expectStatus(201);
  });

  afterAll(() => {
    stash.clearDataStores();
  });

  describe('GET /candidates/:profileId/profile', () => {
    it('should return the candidate profile for an employer (free view, no subscription needed)', async () => {
      await spec()
        .get('/candidates/$S{viewProfileId}/profile')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(200)
        .expectJsonLike({
          profile: {
            firstName: candidateUser.firstName,
          },
        });
    });

    it('should include the visibility key in the profile object', async () => {
      const res = await spec()
        .get('/candidates/$S{viewProfileId}/profile')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(200)
        .returns('.');
      expect(res.profile).toHaveProperty('visibility');
      // No application context for a fresh candidate; resume is metadata-only (or null)
      expect(res).toHaveProperty('application');
      expect(res).toHaveProperty('resume');
    });

    it('should 404 for a non-existent profile', async () => {
      await spec()
        .get(`/candidates/${NIL_UUID}/profile`)
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(404);
    });

    it('should 400 for an invalid profileId', async () => {
      await spec()
        .get('/candidates/not-a-uuid/profile')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(400);
    });

    it('should 400 for an invalid applicationId query param', async () => {
      await spec()
        .get('/candidates/$S{viewProfileId}/profile')
        .withQueryParams({ applicationId: 'not-a-uuid' })
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(400);
    });

    it('should 404 for an unknown applicationId', async () => {
      await spec()
        .get('/candidates/$S{viewProfileId}/profile')
        .withQueryParams({ applicationId: NIL_UUID })
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(404);
    });

    it('should reject requests without a token', async () => {
      await spec().get('/candidates/$S{viewProfileId}/profile').expectStatus(401);
    });

    it('should forbid candidates (employer role required)', async () => {
      await spec()
        .get('/candidates/$S{viewProfileId}/profile')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .expectStatus(403);
    });
  });

  describe('GET /candidates/:profileId/resume', () => {
    it('should 404 when the candidate has no uploaded resume', async () => {
      await spec()
        .get('/candidates/$S{viewProfileId}/resume')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(404);
    });

    it('should 404 for a non-existent profile', async () => {
      await spec()
        .get(`/candidates/${NIL_UUID}/resume`)
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(404);
    });

    it('should reject requests without a token', async () => {
      await spec().get('/candidates/$S{viewProfileId}/resume').expectStatus(401);
    });

    it('should forbid candidates (employer role required)', async () => {
      await spec()
        .get('/candidates/$S{viewProfileId}/resume')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .expectStatus(403);
    });
  });
});
