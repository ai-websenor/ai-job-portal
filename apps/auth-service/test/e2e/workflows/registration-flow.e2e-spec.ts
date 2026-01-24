import { spec, stash } from 'pactum';
import { generateCandidate } from '@ai-job-portal/testing';

describe('Registration Flow (E2E Workflow)', () => {
  const newUser = generateCandidate();

  it('should complete full registration flow', async () => {
    // Step 1: Register user
    await spec()
      .post('/auth/register')
      .withJson({
        email: newUser.email,
        password: newUser.password,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        mobile: newUser.mobile,
        role: 'candidate',
      })
      .expectStatus(201)
      .expectJsonLike({
        message: /Registration successful/,
        userId: /.+/,
      })
      .stores('flow_userId', 'userId');

    // Step 2: Try to login (should work but email not verified warning possible)
    await spec()
      .post('/auth/login')
      .withJson({
        email: newUser.email,
        password: newUser.password,
      })
      .expectStatus(200)
      .expectJsonLike({
        accessToken: /.+/,
        refreshToken: /.+/,
      })
      .stores('flow_accessToken', 'accessToken')
      .stores('flow_refreshToken', 'refreshToken');

    // Step 3: Try to access protected resource
    await spec()
      .get('/users/me/sessions')
      .withHeaders('Authorization', 'Bearer $S{flow_accessToken}')
      .expectStatus(200);

    // Step 4: Refresh token
    await spec()
      .post('/auth/refresh')
      .withJson({
        refreshToken: '$S{flow_refreshToken}',
      })
      .expectStatus(200)
      .expectJsonLike({
        accessToken: /.+/,
      });

    // Step 5: Logout
    await spec()
      .post('/auth/logout')
      .withHeaders('Authorization', 'Bearer $S{flow_accessToken}')
      .withJson({})
      .expectStatus(200);
  });

  it('should handle password reset flow', async () => {
    // Step 1: Request password reset
    await spec()
      .post('/auth/forgot-password')
      .withJson({
        email: newUser.email,
      })
      .expectStatus(200)
      .expectJsonLike({
        message: /.+/,
      });

    // Note: In real tests, you'd verify the email token through DB helper
    // and then complete the reset-password flow
  });

  it('should handle resend verification flow', async () => {
    // Step 1: Register a new user
    const anotherUser = generateCandidate();
    await spec()
      .post('/auth/register')
      .withJson({
        email: anotherUser.email,
        password: anotherUser.password,
        firstName: anotherUser.firstName,
        lastName: anotherUser.lastName,
        mobile: anotherUser.mobile,
        role: 'candidate',
      })
      .expectStatus(201)
      .stores('resend_userId', 'userId');

    // Step 2: Request resend verification
    await spec()
      .post('/auth/resend-verification')
      .withJson({
        userId: '$S{resend_userId}',
      })
      .expectStatus(200);
  });
});
