import { spec } from 'pactum';

describe('Job Moderation Controller (E2E)', () => {
  const adminToken = process.env.TEST_ADMIN_TOKEN || 'test-admin-token';

  describe('GET /admin/jobs/pending', () => {
    it('should list jobs pending moderation', async () => {
      await spec()
        .get('/admin/jobs/pending')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .expectStatus(200)
        .expectJsonSchema({
          type: 'object',
          properties: {
            data: { type: 'array' },
            meta: { type: 'object' },
          },
        });
    });
  });

  describe('GET /admin/jobs/flagged', () => {
    it('should list flagged jobs', async () => {
      await spec()
        .get('/admin/jobs/flagged')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .expectStatus(200);
    });
  });

  describe('POST /admin/jobs/:id/approve', () => {
    it('should approve job', async () => {
      const response = await spec()
        .get('/admin/jobs/pending')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .expectStatus(200)
        .returns('res.body');

      if (response.data && response.data.length > 0) {
        const jobId = response.data[0].id;
        await spec()
          .post(`/admin/jobs/${jobId}/approve`)
          .withHeaders('Authorization', `Bearer ${adminToken}`)
          .expectStatus(200);
      }
    });
  });

  describe('POST /admin/jobs/:id/reject', () => {
    it('should reject job with reason', async () => {
      const response = await spec()
        .get('/admin/jobs/pending')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .expectStatus(200)
        .returns('res.body');

      if (response.data && response.data.length > 0) {
        const jobId = response.data[0].id;
        await spec()
          .post(`/admin/jobs/${jobId}/reject`)
          .withHeaders('Authorization', `Bearer ${adminToken}`)
          .withJson({
            reason: 'Job posting violates guidelines',
          })
          .expectStatus(200);
      }
    });
  });

  describe('POST /admin/jobs/:id/flag', () => {
    it('should flag job for review', async () => {
      const response = await spec()
        .get('/admin/jobs/pending')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .expectStatus(200)
        .returns('res.body');

      if (response.data && response.data.length > 0) {
        const jobId = response.data[0].id;
        await spec()
          .post(`/admin/jobs/${jobId}/flag`)
          .withHeaders('Authorization', `Bearer ${adminToken}`)
          .withJson({
            reason: 'Suspicious content',
          })
          .expectStatus(200);
      }
    });
  });
});
