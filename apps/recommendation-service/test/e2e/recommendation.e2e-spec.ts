import { spec } from 'pactum';

describe('Recommendation Controller (E2E)', () => {
  const candidateToken = process.env.TEST_CANDIDATE_TOKEN || 'test-candidate-token';
  const employerToken = process.env.TEST_EMPLOYER_TOKEN || 'test-employer-token';

  describe('GET /recommendations/jobs', () => {
    it('should get job recommendations for candidate', async () => {
      await spec()
        .get('/recommendations/jobs')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              job: { type: 'object' },
              score: { type: 'number' },
              reasons: { type: 'array' },
            },
          },
        });
    });

    it('should limit recommendations', async () => {
      await spec()
        .get('/recommendations/jobs')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .withQueryParams({ limit: 5 })
        .expectStatus(200)
        .expect((ctx) => {
          if (ctx.res.body.length > 5) {
            throw new Error('Expected max 5 recommendations');
          }
        });
    });
  });

  describe('GET /recommendations/candidates', () => {
    it('should get candidate recommendations for job (employer)', async () => {
      const testJobId = process.env.TEST_JOB_ID || 'test-job-id';
      await spec()
        .get(`/recommendations/candidates/${testJobId}`)
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
        });
    });
  });

  describe('GET /recommendations/similar-jobs/:id', () => {
    it('should get similar jobs', async () => {
      const testJobId = process.env.TEST_JOB_ID || 'test-job-id';
      await spec()
        .get(`/recommendations/similar-jobs/${testJobId}`)
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
        });
    });
  });

  describe('POST /recommendations/feedback', () => {
    it('should record recommendation feedback', async () => {
      await spec()
        .post('/recommendations/feedback')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .withJson({
          recommendationType: 'job',
          recommendationId: 'test-recommendation-id',
          action: 'clicked',
        })
        .expectStatus(200);
    });
  });
});
