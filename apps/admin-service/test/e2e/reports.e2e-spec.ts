import { spec } from 'pactum';

describe('Reports Controller (E2E)', () => {
  const adminToken = process.env.TEST_ADMIN_TOKEN || 'test-admin-token';

  describe('GET /admin/reports/dashboard', () => {
    it('should get dashboard stats', async () => {
      await spec()
        .get('/admin/reports/dashboard')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .expectStatus(200)
        .expectJsonSchema({
          type: 'object',
          properties: {
            totalUsers: { type: 'number' },
            totalJobs: { type: 'number' },
            totalApplications: { type: 'number' },
            activeSubscriptions: { type: 'number' },
          },
        });
    });
  });

  describe('GET /admin/reports/users', () => {
    it('should get user analytics', async () => {
      await spec()
        .get('/admin/reports/users')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .withQueryParams({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .expectStatus(200);
    });
  });

  describe('GET /admin/reports/jobs', () => {
    it('should get job analytics', async () => {
      await spec()
        .get('/admin/reports/jobs')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .withQueryParams({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .expectStatus(200);
    });
  });

  describe('GET /admin/reports/revenue', () => {
    it('should get revenue report', async () => {
      await spec()
        .get('/admin/reports/revenue')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .withQueryParams({
          period: 'monthly',
          year: 2024,
        })
        .expectStatus(200);
    });
  });

  describe('POST /admin/reports/export', () => {
    it('should export report', async () => {
      await spec()
        .post('/admin/reports/export')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .withJson({
          type: 'users',
          format: 'csv',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .expectStatus(200);
    });
  });
});
