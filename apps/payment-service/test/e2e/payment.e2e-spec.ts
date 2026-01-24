import { spec } from 'pactum';
import { faker } from '@faker-js/faker';

describe('Payment Controller (E2E)', () => {
  const employerToken = process.env.TEST_EMPLOYER_TOKEN || 'test-employer-token';

  describe('POST /payments/order', () => {
    it('should create payment order', async () => {
      await spec()
        .post('/payments/order')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .withJson({
          amount: 9900, // cents
          currency: 'usd',
          type: 'job_posting',
          metadata: {
            jobId: faker.string.uuid(),
          },
        })
        .expectStatus(201)
        .expectJsonLike({
          id: /.+/,
          status: 'pending',
        })
        .stores('orderId', 'id');
    });
  });

  describe('GET /payments/:id', () => {
    it('should get payment by ID', async () => {
      await spec()
        .get('/payments/$S{orderId}')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .expectStatus(200)
        .expectJsonLike({
          id: '$S{orderId}',
        });
    });
  });

  describe('GET /payments', () => {
    it('should list payments for user', async () => {
      await spec()
        .get('/payments')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .expectStatus(200)
        .expectJsonSchema({
          type: 'array',
        });
    });

    it('should filter payments by status', async () => {
      await spec()
        .get('/payments')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .withQueryParams({ status: 'completed' })
        .expectStatus(200);
    });
  });

  describe('POST /payments/:id/verify', () => {
    it('should verify payment (mock)', async () => {
      // In real tests, this would use Stripe/Razorpay test mode
      await spec()
        .post('/payments/$S{orderId}/verify')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .withJson({
          paymentId: 'test_payment_id',
          signature: 'test_signature',
        })
        .expectStatus(200);
    });
  });

  describe('POST /payments/:id/refund', () => {
    it('should fail to refund non-completed payment', async () => {
      await spec()
        .post('/payments/$S{orderId}/refund')
        .withHeaders('Authorization', `Bearer ${employerToken}`)
        .withJson({
          reason: 'Customer request',
        })
        .expectStatus(400);
    });
  });
});
