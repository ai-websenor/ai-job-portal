import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import { Database, deviceTokens } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import * as admin from 'firebase-admin';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const projectId = this.configService.get('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase config not provided — push notifications disabled');
      return;
    }

    try {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // Private key comes as escaped string from env — unescape newlines
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      this.logger.log('Firebase Admin SDK initialized');
    } catch (error: any) {
      this.logger.error(`Firebase init failed: ${error.message}`);
    }
  }

  private get messaging(): admin.messaging.Messaging | null {
    return this.firebaseApp ? admin.messaging(this.firebaseApp) : null;
  }

  async registerToken(userId: string, token: string, platform: 'web' | 'android' | 'ios') {
    // Upsert: if token already exists for this user, update; else insert
    const existing = await this.db.query.deviceTokens.findFirst({
      where: eq(deviceTokens.token, token),
    });

    if (existing) {
      await this.db
        .update(deviceTokens)
        .set({ userId, platform, isActive: true, updatedAt: new Date() })
        .where(eq(deviceTokens.id, existing.id));
      return { message: 'Device token updated' };
    }

    await this.db.insert(deviceTokens).values({
      userId,
      token,
      platform,
    });

    return { message: 'Device token registered' };
  }

  async removeToken(token: string) {
    await this.db
      .update(deviceTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(deviceTokens.token, token));

    return { message: 'Device token deactivated' };
  }

  async removeAllUserTokens(userId: string) {
    await this.db
      .update(deviceTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(deviceTokens.userId, userId));

    return { message: 'All device tokens deactivated' };
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<number> {
    if (!this.messaging) {
      this.logger.debug('FCM not configured, skipping push');
      return 0;
    }

    // Get all active tokens for user
    const tokens = await this.db.query.deviceTokens.findMany({
      where: and(eq(deviceTokens.userId, userId), eq(deviceTokens.isActive, true)),
    });

    if (tokens.length === 0) return 0;

    const tokenStrings = tokens.map((t) => t.token);
    let sentCount = 0;

    try {
      const response = await this.messaging.sendEachForMulticast({
        tokens: tokenStrings,
        notification: { title, body },
        data,
      });

      sentCount = response.successCount;

      // Deactivate failed tokens (invalid/expired)
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              failedTokens.push(tokenStrings[idx]);
            }
          }
        });

        // Deactivate invalid tokens
        for (const failedToken of failedTokens) {
          await this.db
            .update(deviceTokens)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(deviceTokens.token, failedToken));
        }

        if (failedTokens.length > 0) {
          this.logger.log(
            `Deactivated ${failedTokens.length} invalid FCM tokens for user ${userId}`,
          );
        }
      }

      this.logger.debug(`Push sent to ${sentCount}/${tokens.length} devices for user ${userId}`);
    } catch (error: any) {
      this.logger.error(`FCM send failed for user ${userId}: ${error.message}`);
    }

    return sentCount;
  }
}
