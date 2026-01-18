import { spec } from 'pactum';

describe('Subscription Controller (E2E)', () => {
  const employerToken = process.env.TEST_EMPLOYER_TOKEN || 'test-employer-token';

  describe('GET /subscriptions/plans', () => {
    it('should list available plans', async () => {
      await spec()
        .get('/subscriptions/plans')
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              features: { type: 'array' },
            },
          },
        });
    });
  });

  describe('POST /subscriptions', () => {
    it('should create subscription', async () => {
      await spec()
        .post('/subscriptions')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .withJson({
          planId: 'basic-monthly',
        })
        .expectStatus(201)
        .expectJsonLike({
          status: 'active',
        })
        .stores('subscriptionId', 'id');
    });
  });

  describe('GET /subscriptions/current', () => {
    it('should get current subscription', async () => {
      await spec()
        .get('/subscriptions/current')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .expectStatus(200)
        .expectJsonLike({
          id: '$S{subscriptionId}',
        });
    });
  });

  describe('PUT /subscriptions/:id/upgrade', () => {
    it('should upgrade subscription plan', async () => {
      await spec()
        .put('/subscriptions/$S{subscriptionId}/upgrade')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .withJson({
          planId: 'pro-monthly',
        })
        .expectStatus(200);
    });
  });

  describe('POST /subscriptions/:id/cancel', () => {
    it('should cancel subscription', async () => {
      // Create a new subscription to cancel
      await spec()
        .post('/subscriptions')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .withJson({
          planId: 'basic-monthly',
        })
        .expectStatus(201)
        .stores('cancelSubId', 'id');

      await spec()
        .post('/subscriptions/$S{cancelSubId}/cancel')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .withJson({
          reason: 'No longer needed',
          cancelAtPeriodEnd: true,
        })
        .expectStatus(200)
        .expectJsonLike({
          status: 'canceling',
        });
    });
  });

  describe('GET /subscriptions/history', () => {
    it('should get subscription history', async () => {
      await spec()
        .get('/subscriptions/history')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
        });
    });
  });
});
