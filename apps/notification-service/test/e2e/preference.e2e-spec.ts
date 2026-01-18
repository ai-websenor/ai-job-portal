import { spec } from 'pactum';

describe('Notification Preferences (E2E)', () => {
  const candidateToken = process.env.TEST_CANDIDATE_TOKEN || 'test-candidate-token';

  describe('GET /notification-preferences', () => {
    it('should get notification preferences', async () => {
      await spec()
        .get('/notification-preferences')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200)
        .expectJsonSchema({
          type: 'object',
          properties: {
            email: { type: 'object' },
            push: { type: 'object' },
            sms: { type: 'object' },
          },
        });
    });
  });

  describe('PUT /notification-preferences', () => {
    it('should update notification preferences', async () => {
      await spec()
        .put('/notification-preferences')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .withJson({
          email: {
            jobAlerts: true,
            applicationUpdates: true,
            marketing: false,
          },
          push: {
            jobAlerts: true,
            applicationUpdates: true,
            messages: true,
          },
          sms: {
            interviewReminders: true,
          },
        })
        .expectStatus(200);
    });

    it('should toggle specific preference', async () => {
      await spec()
        .put('/notification-preferences')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .withJson({
          email: {
            marketing: true,
          },
        })
        .expectStatus(200);

      // Verify change persisted
      await spec()
        .get('/notification-preferences')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200)
        .expectJsonLike({
          email: {
            marketing: true,
          },
        });
    });
  });

  describe('POST /notification-preferences/reset', () => {
    it('should reset to default preferences', async () => {
      await spec()
        .post('/notification-preferences/reset')
        .withHeaders('Authorization', `Bearer ${candidateToken}`)
        .expectStatus(200);
    });
  });
});
