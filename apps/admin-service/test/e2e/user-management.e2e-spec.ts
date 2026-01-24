import { spec } from 'pactum';

describe('User Management Controller (E2E)', () => {
  const adminToken = process.env.TEST_ADMIN_TOKEN || 'test-admin-token';

  describe('GET /admin/users', () => {
    it('should list all users', async () => {
      await spec()
        .get('/admin/users')
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

    it('should filter users by role', async () => {
      await spec()
        .get('/admin/users')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .withQueryParams({ role: 'candidate' })
        .expectStatus(200);
    });

    it('should search users', async () => {
      await spec()
        .get('/admin/users')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .withQueryParams({ search: 'test' })
        .expectStatus(200);
    });
  });

  describe('GET /admin/users/:id', () => {
    it('should get user by ID', async () => {
      // Get first user from list
      const response = await spec()
        .get('/admin/users')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .expectStatus(200)
        .returns('res.body');

      if (response.data && response.data.length > 0) {
        const userId = response.data[0].id;
        await spec()
          .get(`/admin/users/${userId}`)
          .withHeaders('Authorization', `Bearer ${adminToken}`)
          .expectStatus(200)
          .expectJsonLike({
            id: userId,
          });
      }
    });
  });

  describe('PUT /admin/users/:id/status', () => {
    it('should suspend user', async () => {
      const response = await spec()
        .get('/admin/users')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .withQueryParams({ role: 'candidate' })
        .expectStatus(200)
        .returns('res.body');

      if (response.data && response.data.length > 0) {
        const userId = response.data[0].id;
        await spec()
          .put(`/admin/users/${userId}/status`)
          .withHeaders('Authorization', `Bearer ${adminToken}`)
          .withJson({
            status: 'suspended',
            reason: 'Policy violation - test',
          })
          .expectStatus(200);
      }
    });
  });

  describe('POST /admin/users/bulk-action', () => {
    it('should perform bulk action', async () => {
      await spec()
        .post('/admin/users/bulk-action')
        .withHeaders('Authorization', `Bearer ${adminToken}`)
        .withJson({
          action: 'send-notification',
          userIds: [],
          data: {
            message: 'Test notification',
          },
        })
        .expectStatus(200);
    });
  });
});
