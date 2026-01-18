import { spec } from 'pactum';

describe('Interaction Controller (E2E)', () => {
  const candidateToken = process.env.TEST_CANDIDATE_TOKEN || 'test-candidate-token';

  describe('POST /interactions/view', () => {
    it('should log job view interaction', async () => {
      const testJobId = process.env.TEST_JOB_ID || 'test-job-id';
      await spec()
        .post('/interactions/view')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .withJson({
          entityType: 'job',
          entityId: testJobId,
          duration: 30,
        })
        .expectStatus(200);
    });
  });

  describe('POST /interactions/search', () => {
    it('should log search interaction', async () => {
      await spec()
        .post('/interactions/search')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .withJson({
          query: 'software engineer',
          filters: {
            location: 'remote',
            salary: 100000,
          },
          resultsCount: 50,
        })
        .expectStatus(200);
    });
  });

  describe('POST /interactions/apply', () => {
    it('should log application interaction', async () => {
      const testJobId = process.env.TEST_JOB_ID || 'test-job-id';
      await spec()
        .post('/interactions/apply')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .withJson({
          jobId: testJobId,
          source: 'recommendation',
        })
        .expectStatus(200);
    });
  });

  describe('GET /interactions/history', () => {
    it('should get interaction history', async () => {
      await spec()
        .get('/interactions/history')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
        });
    });

    it('should filter by interaction type', async () => {
      await spec()
        .get('/interactions/history')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .withQueryParams({ type: 'view' })
        .expectStatus(200);
    });
  });

  describe('DELETE /interactions/history', () => {
    it('should clear interaction history', async () => {
      await spec()
        .delete('/interactions/history')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200);
    });
  });
});
