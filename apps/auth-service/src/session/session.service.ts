import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, desc, ne } from 'drizzle-orm';
import { Database, sessions, socialLogins } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class SessionService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  // Session Management
  async getUserSessions(userId: string, currentToken?: string) {
    const userSessions = await this.db.query.sessions.findMany({
      where: eq(sessions.userId, userId),
      orderBy: [desc(sessions.createdAt)],
    });

    return userSessions.map(session => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      isCurrent: currentToken ? session.token === currentToken : false,
    }));
  }

  async deleteSession(userId: string, sessionId: string, currentToken?: string) {
    const session = await this.db.query.sessions.findFirst({
      where: and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
      ),
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Prevent deleting current session if it's explicitly the current one
    if (currentToken && session.token === currentToken) {
      throw new ForbiddenException('Cannot delete current session. Use logout instead.');
    }

    await this.db.delete(sessions).where(eq(sessions.id, sessionId));

    return { success: true, message: 'Session terminated' };
  }

  async deleteAllSessions(userId: string, currentToken?: string) {
    // Delete all sessions except current (if provided)
    if (currentToken) {
      await this.db.delete(sessions).where(
        and(
          eq(sessions.userId, userId),
          ne(sessions.token, currentToken),
        ),
      );
    } else {
      await this.db.delete(sessions).where(eq(sessions.userId, userId));
    }

    return { success: true, message: 'All other sessions terminated' };
  }

  // Social Login Management
  async getSocialLogins(userId: string) {
    const logins = await this.db.query.socialLogins.findMany({
      where: eq(socialLogins.userId, userId),
      orderBy: [desc(socialLogins.createdAt)],
    });

    return logins.map(login => ({
      id: login.id,
      provider: login.provider,
      email: login.email,
      createdAt: login.createdAt,
    }));
  }

  async disconnectSocialLogin(userId: string, provider: string) {
    const login = await this.db.query.socialLogins.findFirst({
      where: and(
        eq(socialLogins.userId, userId),
        eq(socialLogins.provider, provider as any),
      ),
    });

    if (!login) {
      throw new NotFoundException(`No ${provider} account connected`);
    }

    // Check if user has a password set (to prevent locking themselves out)
    const user = await this.db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      columns: { password: true },
    });

    // Get count of social logins
    const socialLoginsCount = await this.db.query.socialLogins.findMany({
      where: eq(socialLogins.userId, userId),
    });

    // If this is the only login method and no password, prevent disconnect
    if (socialLoginsCount.length === 1 && (!user?.password || user.password === '')) {
      throw new ForbiddenException('Cannot disconnect the only login method. Please set a password first.');
    }

    await this.db.delete(socialLogins).where(eq(socialLogins.id, login.id));

    return { success: true, message: `${provider} account disconnected` };
  }
}
