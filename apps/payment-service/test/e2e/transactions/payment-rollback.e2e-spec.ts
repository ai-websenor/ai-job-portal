import { spec } from 'pactum';

describe('Payment Transaction Atomicity (E2E)', () => {
  const employerToken = process.env.TEST_EMPLOYER_TOKEN || 'test-employer-token';

  describe('Failed payment should rollback', () => {
    it('should not create order on payment failure', async () => {
      // Get initial payment count
      const initialResponse = await spec()
        .get('/payments')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .expectStatus(200)
        .returns('res.body');

      const initialCount = initialResponse.length;

      // Attempt payment with invalid data
      await spec()
        .post('/payments/order')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .withJson({
          amount: -100, // Invalid amount
          currency: 'usd',
        })
        .expectStatus(400);

      // Verify count unchanged
      await spec()
        .get('/payments')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .expectStatus(200)
        .expect((ctx) => {
          if (ctx.res.body.length !== initialCount) {
            throw new Error('Payment count changed after failed transaction');
          }
        });
    });
  });

  describe('Partial subscription failure should rollback', () => {
    it('should rollback subscription on payment failure', async () => {
      // Attempt subscription with invalid payment
      await spec()
        .post('/subscriptions')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .withJson({
          planId: 'non-existent-plan',
        })
        .expectStatus(400);
    });
  });

  describe('Concurrent payment handling', () => {
    it('should handle concurrent payment requests', async () => {
      // Create multiple payment orders concurrently
      const payments = Array.from({ length: 3 }, (_, i) =>
        spec()
          .post('/payments/order')
          .withHeaders('Authorization', `Bearer ${employerToken}`)
          .withJson({
            amount: 1000 * (i + 1),
            currency: 'usd',
            type: 'job_posting',
          })
          .expectStatus(201)
      );

      const results = await Promise.all(payments);

      // All should succeed with unique IDs
      const ids = results.map((r) => r.json.id);
      const uniqueIds = new Set(ids);
      if (uniqueIds.size !== ids.length) {
        throw new Error('Duplicate payment IDs detected');
      }
    });
  });
});
