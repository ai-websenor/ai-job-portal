import { spec } from 'pactum';

describe('Notification Controller (E2E)', () => {
  const candidateToken = process.env.TEST_CANDIDATE_TOKEN || 'test-candidate-token';

  describe('GET /notifications', () => {
    it('should get user notifications', async () => {
      await spec()
        .get('/notifications')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200)
        .expectJsonSchema({
          type: 'object',
          properties: {
            data: { type: 'array' },
            meta: { type: 'object' },
          },
        });
    });

    it('should paginate notifications', async () => {
      await spec()
        .get('/notifications')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .withQueryParams({ page: 1, limit: 10 })
        .expectStatus(200);
    });

    it('should filter unread notifications', async () => {
      await spec()
        .get('/notifications')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .withQueryParams({ unread: true })
        .expectStatus(200);
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should get unread notification count', async () => {
      await spec()
        .get('/notifications/unread-count')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200)
        .expectJsonSchema({
          type: 'object',
          properties: {
            count: { type: 'number' },
          },
        });
    });
  });

  describe('PUT /notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      // First get a notification ID
      const response = await spec()
        .get('/notifications')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200)
        .returns('res.body');

      if (response.data && response.data.length > 0) {
        const notificationId = response.data[0].id;
        await spec()
          .put(`/notifications/${notificationId}/read`)
          .withHeaders('Authorization', `Bearer ${candidateToken}`)
          .expectStatus(200);
      }
    });
  });

  describe('PUT /notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      await spec()
        .put('/notifications/mark-all-read')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200);
    });
  });

  describe('DELETE /notifications/:id', () => {
    it('should delete notification', async () => {
      const response = await spec()
        .get('/notifications')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200)
        .returns('res.body');

      if (response.data && response.data.length > 0) {
        const notificationId = response.data[0].id;
        await spec()
          .delete(`/notifications/${notificationId}`)
          .withHeaders('Authorization', `Bearer ${candidateToken}`)
          .expectStatus(200);
      }
    });
  });
});
