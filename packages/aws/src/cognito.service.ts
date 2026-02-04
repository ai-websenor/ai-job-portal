import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  AdminConfirmSignUpCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
  GetUserCommand,
  AdminGetUserCommand,
  ResendConfirmationCodeCommand,
  AdminSetUserPasswordCommand,
  ChangePasswordCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';
import { AWS_CONFIG, AwsConfig } from './aws.config';

export interface CognitoAuthResult {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export interface CognitoUser {
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  phoneNumber?: string;
}

@Injectable()
export class CognitoService {
  private readonly logger = new Logger(CognitoService.name);
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;
  private readonly clientSecret?: string;
  private readonly domain: string;

  constructor(@Inject(AWS_CONFIG) private readonly config: AwsConfig) {
    if (!config.cognito) {
      this.logger.warn('Cognito config not provided - CognitoService will be unavailable');
      this.userPoolId = '';
      this.clientId = '';
      this.domain = '';
      this.client = null as any;
      return;
    }

    this.client = new CognitoIdentityProviderClient({
      region: config.region,
      ...(config.accessKeyId && {
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey!,
        },
      }),
    });

    this.userPoolId = config.cognito.userPoolId;
    this.clientId = config.cognito.clientId;
    this.clientSecret = config.cognito.clientSecret;
    this.domain = config.cognito.domain;
  }

  private ensureConfigured(): void {
    if (!this.client) {
      throw new Error(
        'CognitoService is not configured. Please provide cognito config in AwsModule.',
      );
    }
  }

  private calculateSecretHash(username: string): string | undefined {
    if (!this.clientSecret) return undefined;

    const hmac = createHmac('sha256', this.clientSecret);
    hmac.update(username + this.clientId);
    return hmac.digest('base64');
  }

  async signUp(
    email: string,
    password: string,
    attributes?: { givenName?: string; familyName?: string; phoneNumber?: string },
  ): Promise<{ userSub: string; codeDeliveryDetails: any }> {
    const userAttributes = [{ Name: 'email', Value: email }];

    if (attributes?.givenName) {
      userAttributes.push({ Name: 'given_name', Value: attributes.givenName });
    }
    if (attributes?.familyName) {
      userAttributes.push({ Name: 'family_name', Value: attributes.familyName });
    }
    if (attributes?.phoneNumber) {
      userAttributes.push({ Name: 'phone_number', Value: attributes.phoneNumber });
    }

    const command = new SignUpCommand({
      ClientId: this.clientId,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
      SecretHash: this.calculateSecretHash(email),
    });

    const result = await this.client.send(command);

    this.logger.log(`User signed up: ${result.UserSub}`);

    return {
      userSub: result.UserSub!,
      codeDeliveryDetails: result.CodeDeliveryDetails,
    };
  }

  async confirmSignUp(email: string, code: string): Promise<void> {
    const command = new ConfirmSignUpCommand({
      ClientId: this.clientId,
      Username: email,
      ConfirmationCode: code,
      SecretHash: this.calculateSecretHash(email),
    });

    await this.client.send(command);
    this.logger.log(`User confirmed: ${email}`);
  }

  async adminConfirmSignUp(email: string): Promise<void> {
    const command = new AdminConfirmSignUpCommand({
      UserPoolId: this.userPoolId,
      Username: email,
    });

    await this.client.send(command);
    this.logger.log(`User admin-confirmed: ${email}`);
  }

  async resendConfirmationCode(email: string): Promise<void> {
    const command = new ResendConfirmationCodeCommand({
      ClientId: this.clientId,
      Username: email,
      SecretHash: this.calculateSecretHash(email),
    });

    await this.client.send(command);
    this.logger.log(`Confirmation code resent to: ${email}`);
  }

  async signIn(email: string, password: string): Promise<CognitoAuthResult> {
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: this.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        ...(this.clientSecret && { SECRET_HASH: this.calculateSecretHash(email) }),
      },
    });

    const result = await this.client.send(command);

    if (!result.AuthenticationResult) {
      throw new Error('Authentication failed');
    }

    this.logger.log(`User signed in: ${email}`);

    return {
      accessToken: result.AuthenticationResult.AccessToken!,
      refreshToken: result.AuthenticationResult.RefreshToken!,
      idToken: result.AuthenticationResult.IdToken!,
      expiresIn: result.AuthenticationResult.ExpiresIn!,
    };
  }

  async refreshToken(refreshToken: string, email: string): Promise<CognitoAuthResult> {
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      ClientId: this.clientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        ...(this.clientSecret && { SECRET_HASH: this.calculateSecretHash(email) }),
      },
    });

    const result = await this.client.send(command);

    if (!result.AuthenticationResult) {
      throw new Error('Token refresh failed');
    }

    return {
      accessToken: result.AuthenticationResult.AccessToken!,
      refreshToken: refreshToken, // Refresh token doesn't change
      idToken: result.AuthenticationResult.IdToken!,
      expiresIn: result.AuthenticationResult.ExpiresIn!,
    };
  }

  async signOut(accessToken: string): Promise<void> {
    const command = new GlobalSignOutCommand({
      AccessToken: accessToken,
    });

    await this.client.send(command);
    this.logger.log('User signed out globally');
  }

  async forgotPassword(email: string): Promise<void> {
    const command = new ForgotPasswordCommand({
      ClientId: this.clientId,
      Username: email,
      SecretHash: this.calculateSecretHash(email),
    });

    await this.client.send(command);
    this.logger.log(`Password reset initiated for: ${email}`);
  }

  async confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: this.clientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
      SecretHash: this.calculateSecretHash(email),
    });

    await this.client.send(command);
    this.logger.log(`Password reset confirmed for: ${email}`);
  }

  /**
   * Admin-level password reset - bypasses OTP verification
   * Use this for dev mode or admin-initiated password resets
   */
  async adminSetUserPassword(email: string, newPassword: string, permanent = true): Promise<void> {
    const command = new AdminSetUserPasswordCommand({
      UserPoolId: this.userPoolId,
      Username: email,
      Password: newPassword,
      Permanent: permanent,
    });

    await this.client.send(command);
    this.logger.log(`Password admin-set for: ${email}`);
  }

  /**
   * Change password for authenticated user
   * Requires the user's current access token and both old and new passwords
   */
  async changePassword(
    accessToken: string,
    previousPassword: string,
    proposedPassword: string,
  ): Promise<void> {
    this.ensureConfigured();

    const command = new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: previousPassword,
      ProposedPassword: proposedPassword,
    });

    await this.client.send(command);
    this.logger.log('Password changed successfully');
  }

  async getUser(accessToken: string): Promise<CognitoUser> {
    const command = new GetUserCommand({
      AccessToken: accessToken,
    });

    const result = await this.client.send(command);

    const attrs = result.UserAttributes || [];
    const getAttr = (name: string) => attrs.find((a) => a.Name === name)?.Value;

    return {
      sub: getAttr('sub')!,
      email: getAttr('email')!,
      emailVerified: getAttr('email_verified') === 'true',
      givenName: getAttr('given_name'),
      familyName: getAttr('family_name'),
      phoneNumber: getAttr('phone_number'),
    };
  }

  async adminGetUser(email: string): Promise<CognitoUser | null> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      });

      const result = await this.client.send(command);

      const attrs = result.UserAttributes || [];
      const getAttr = (name: string) => attrs.find((a) => a.Name === name)?.Value;

      return {
        sub: getAttr('sub')!,
        email: getAttr('email')!,
        emailVerified: getAttr('email_verified') === 'true',
        givenName: getAttr('given_name'),
        familyName: getAttr('family_name'),
        phoneNumber: getAttr('phone_number'),
      };
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        return null;
      }
      throw error;
    }
  }

  getAuthorizationUrl(provider: 'Google' | 'SignInWithApple', redirectUri: string): string {
    const baseUrl = `https://${this.domain}.auth.${this.config.region}.amazoncognito.com`;
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: redirectUri,
      identity_provider: provider,
    });

    return `${baseUrl}/oauth2/authorize?${params.toString()}`;
  }
}
