import { spec, stash } from 'pactum';
import {
  generateCandidate,
  generateEmployer,
  generateCandidateProfile,
  SERVICE_PORTS,
} from '@ai-job-portal/testing';

const AUTH_BASE_URL =
  process.env.AUTH_SERVICE_URL || `http://localhost:${SERVICE_PORTS['auth-service']}/api/v1`;

describe('Candidate Search (E2E)', () => {
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
    // Candidate — registers, logs in, and creates a (public) profile to be searched/saved
    await registerAndLogin(candidateUser, 'candidate', 'candidate_token');
    await spec()
      .post('/candidates/profile')
      .withHeaders('Authorization', 'Bearer $S{candidate_token}')
      .withJson(generateCandidateProfile())
      .expectStatus(201)
      .stores('searchProfileId', 'id');

    // Employer — registers, logs in, and creates an employer profile (needed to resolve employerId)
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

  describe('GET /candidates/search', () => {
    it('should return paginated candidates for an employer', async () => {
      await spec()
        .get('/candidates/search')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(200)
        .expectJsonLike({
          message: 'Candidates fetched successfully',
          pagination: { currentPage: 1 },
        });
    });

    it('should accept all filter params', async () => {
      await spec()
        .get('/candidates/search')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withQueryParams({
          query: 'developer',
          location: 'Bangalore',
          experienceLevels: '3-5,5-10',
          employmentTypes: 'full_time',
          availability: 'immediate,15d',
          salaryMin: 5,
          salaryMax: 20,
          sortBy: 'recent',
          page: 1,
          limit: 5,
        })
        .expectStatus(200);
    });

    it('should reject requests without a token', async () => {
      await spec().get('/candidates/search').expectStatus(401);
    });

    it('should forbid candidates (employer role required)', async () => {
      await spec()
        .get('/candidates/search')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .expectStatus(403);
    });
  });

  describe('POST /candidates/saved', () => {
    it('should save a candidate', async () => {
      await spec()
        .post('/candidates/saved')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson({ profileId: '$S{searchProfileId}', note: 'Strong profile' })
        .expectStatus(201)
        .expectJsonLike({ message: 'Candidate saved successfully' });
    });

    it('should be idempotent on duplicate save', async () => {
      await spec()
        .post('/candidates/saved')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson({ profileId: '$S{searchProfileId}', note: 'Updated note' })
        .expectStatus(201);
    });

    it('should 404 for a non-existent profile', async () => {
      await spec()
        .post('/candidates/saved')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .withJson({ profileId: '00000000-0000-0000-0000-000000000000' })
        .expectStatus(404);
    });

    it('should forbid candidates', async () => {
      await spec()
        .post('/candidates/saved')
        .withHeaders('Authorization', 'Bearer $S{candidate_token}')
        .withJson({ profileId: '$S{searchProfileId}' })
        .expectStatus(403);
    });
  });

  describe('GET /candidates/saved', () => {
    it('should list saved candidates with the saved profile flagged', async () => {
      await spec()
        .get('/candidates/saved')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(200)
        .expectJsonLike({
          message: 'Saved candidates fetched successfully',
          data: [{ isSaved: true }],
        });
    });
  });

  describe('DELETE /candidates/saved/:profileId', () => {
    it('should remove a saved candidate', async () => {
      await spec()
        .delete('/candidates/saved/$S{searchProfileId}')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(200)
        .expectJsonLike({ message: 'Candidate removed from saved list' });
    });

    it('should 404 when removing an already-removed candidate', async () => {
      await spec()
        .delete('/candidates/saved/$S{searchProfileId}')
        .withHeaders('Authorization', 'Bearer $S{employer_token}')
        .expectStatus(404);
    });
  });
});
