import { spec, stash } from 'pactum';
import { generateCandidate, generateEmployer } from '@ai-job-portal/testing';

describe('Auth Controller (E2E)', () => {
  const testUser = generateCandidate();

  describe('POST /auth/register', () => {
    it('should register a new candidate user', async () => {
      await spec()
        .post('/auth/register')
        .withJson({
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          mobile: testUser.mobile,
          role: 'candidate',
        })
        .expectStatus(201)
        .expectJsonLike({
          message: /Registration successful/,
          userId: /.+/,
        })
        .stores('userId', 'userId');
    });

    it('should register a new employer user', async () => {
      const employer = generateEmployer();
      await spec()
        .post('/auth/register')
        .withJson({
          email: employer.email,
          password: employer.password,
          firstName: employer.firstName,
          lastName: employer.lastName,
          mobile: employer.mobile,
          role: 'employer',
        })
        .expectStatus(201)
        .expectJsonLike({
          message: /Registration successful/,
        });
    });

    it('should fail with duplicate email', async () => {
      await spec()
        .post('/auth/register')
        .withJson({
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          mobile: testUser.mobile,
          role: 'candidate',
        })
        .expectStatus(409);
    });

    it('should fail with invalid email', async () => {
      await spec()
        .post('/auth/register')
        .withJson({
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          mobile: '+11234567890',
          role: 'candidate',
        })
        .expectStatus(400);
    });

    it('should fail with weak password', async () => {
      await spec()
        .post('/auth/register')
        .withJson({
          email: 'newuser@test.com',
          password: '123',
          firstName: 'Test',
          lastName: 'User',
          mobile: '+11234567890',
          role: 'candidate',
        })
        .expectStatus(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      await spec()
        .post('/auth/login')
        .withJson({
          email: testUser.email,
          password: testUser.password,
        })
        .expectStatus(200)
        .expectJsonLike({
          accessToken: /.+/,
          refreshToken: /.+/,
        })
        .stores('accessToken', 'accessToken')
        .stores('refreshToken', 'refreshToken');
    });

    it('should fail with invalid password', async () => {
      await spec()
        .post('/auth/login')
        .withJson({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expectStatus(401);
    });

    it('should fail with non-existent user', async () => {
      await spec()
        .post('/auth/login')
        .withJson({
          email: 'nonexistent@test.com',
          password: 'Password123!',
        })
        .expectStatus(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      await spec()
        .post('/auth/refresh')
        .withJson({
          refreshToken: '$S{refreshToken}',
        })
        .expectStatus(200)
        .expectJsonLike({
          accessToken: /.+/,
          refreshToken: /.+/,
        })
        .stores('newAccessToken', 'accessToken')
        .stores('newRefreshToken', 'refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      await spec()
        .post('/auth/refresh')
        .withJson({
          refreshToken: 'invalid-refresh-token',
        })
        .expectStatus(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      await spec()
        .post('/auth/logout')
        .withHeaders('Authorization', 'Bearer $S{newAccessToken}')
        .withJson({
          refreshToken: '$S{newRefreshToken}',
        })
        .expectStatus(200)
        .expectJsonLike({
          message: 'Logged out successfully',
        });
    });

    it('should fail without auth token', async () => {
      await spec()
        .post('/auth/logout')
        .withJson({})
        .expectStatus(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send reset password email for valid user', async () => {
      await spec()
        .post('/auth/forgot-password')
        .withJson({
          email: testUser.email,
        })
        .expectStatus(200)
        .expectJsonLike({
          message: /.+/,
        });
    });

    it('should not reveal if email exists', async () => {
      await spec()
        .post('/auth/forgot-password')
        .withJson({
          email: 'nonexistent@test.com',
        })
        .expectStatus(200);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should fail with invalid OTP', async () => {
      await spec()
        .post('/auth/verify-email')
        .withJson({
          userId: '$S{userId}',
          otp: '000000',
        })
        .expectStatus(400);
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email', async () => {
      await spec()
        .post('/auth/resend-verification')
        .withJson({
          userId: '$S{userId}',
        })
        .expectStatus(200);
    });
  });
});
