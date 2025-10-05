import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as UAParser from 'ua-parser-js';
import { sessions } from '@ai-job-portal/database';
import { DatabaseService } from '../../database/database.service';
import { DeviceInfo } from '../../common/interfaces/device-info.interface';

@Injectable()
export class SessionService {
  private readonly maxConcurrentSessions: number;
  private readonly sessionExpiration: number;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.maxConcurrentSessions = this.configService.get<number>('app.security.maxConcurrentSessions');
    this.sessionExpiration = this.configService.get<number>('app.security.sessionExpiration');
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    accessToken: string,
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ) {
    // Parse user agent to get device info
    const parser = new UAParser(userAgent);
    const deviceInfo: DeviceInfo = {
      browser: parser.getBrowser().name,
      browserVersion: parser.getBrowser().version,
      os: parser.getOS().name,
      osVersion: parser.getOS().version,
      device: parser.getDevice().model || parser.getDevice().type || 'Desktop',
      deviceType: parser.getDevice().type || 'desktop',
    };

    // Check concurrent sessions limit
    await this.enforceConcurrentSessionsLimit(userId);

    // Calculate expiration
    const expiresAt = new Date(Date.now() + this.sessionExpiration);

    // Create session
    const [session] = await this.databaseService.db
      .insert(sessions)
      .values({
        userId,
        token: accessToken,
        refreshToken,
        ipAddress,
        userAgent,
        deviceInfo: JSON.stringify(deviceInfo),
        expiresAt,
      })
      .returning();

    return session;
  }

  /**
   * Find session by token
   */
  async findByToken(token: string) {
    const [session] = await this.databaseService.db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    return session || null;
  }

  /**
   * Find session by refresh token
   */
  async findByRefreshToken(refreshToken: string) {
    const [session] = await this.databaseService.db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshToken, refreshToken))
      .limit(1);

    return session || null;
  }

  /**
   * Find all active sessions for a user
   */
  async findUserSessions(userId: string) {
    const now = new Date();

    const userSessions = await this.databaseService.db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.userId, userId),
      ))
      .orderBy(desc(sessions.createdAt));

    // Filter active sessions
    return userSessions.filter(session => new Date(session.expiresAt) > now);
  }

  /**
   * Update session tokens (for refresh)
   */
  async updateSessionTokens(sessionId: string, newAccessToken: string, newRefreshToken: string) {
    const expiresAt = new Date(Date.now() + this.sessionExpiration);

    const [updatedSession] = await this.databaseService.db
      .update(sessions)
      .set({
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt,
      })
      .where(eq(sessions.id, sessionId))
      .returning();

    return updatedSession;
  }

  /**
   * Delete a specific session (logout)
   */
  async deleteSession(sessionId: string) {
    await this.databaseService.db
      .delete(sessions)
      .where(eq(sessions.id, sessionId));
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   */
  async deleteAllUserSessions(userId: string) {
    await this.databaseService.db
      .delete(sessions)
      .where(eq(sessions.userId, userId));
  }

  /**
   * Delete session by token
   */
  async deleteByToken(token: string) {
    await this.databaseService.db
      .delete(sessions)
      .where(eq(sessions.token, token));
  }

  /**
   * Validate session expiration
   */
  isSessionValid(session: typeof sessions.$inferSelect): boolean {
    return new Date(session.expiresAt) > new Date();
  }

  /**
   * Enforce concurrent sessions limit
   */
  private async enforceConcurrentSessionsLimit(userId: string) {
    const activeSessions = await this.findUserSessions(userId);

    if (activeSessions.length >= this.maxConcurrentSessions) {
      // Delete the oldest session
      const oldestSession = activeSessions[activeSessions.length - 1];
      await this.deleteSession(oldestSession.id);
    }
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  async cleanupExpiredSessions() {
    const now = new Date();

    const result = await this.databaseService.db
      .delete(sessions)
      .where(eq(sessions.expiresAt, now));

    return result;
  }
}
