import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { users } from '@ai-job-portal/database';
import { UserRole } from '@ai-job-portal/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class UserService {
  private readonly bcryptRounds: number;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptRounds = this.configService.get<number>('app.security.bcryptRounds');
  }

  /**
   * Create a new user
   */
  async createUser(email: string, password: string, role: UserRole) {
    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);

    // Create user
    const [user] = await this.databaseService.db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        role,
        isVerified: false,
        isActive: true,
      })
      .returning();

    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string) {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Validate user password
   */
  async validatePassword(user: typeof users.$inferSelect, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  /**
   * Update user password
   */
  async updatePassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

    const [updatedUser] = await this.databaseService.db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string) {
    const [updatedUser] = await this.databaseService.db
      .update(users)
      .set({
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  /**
   * Enable 2FA for user
   */
  async enable2FA(userId: string, secret: string) {
    const [updatedUser] = await this.databaseService.db
      .update(users)
      .set({
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId: string) {
    const [updatedUser] = await this.databaseService.db
      .update(users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string) {
    await this.databaseService.db
      .update(users)
      .set({
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string) {
    const [updatedUser] = await this.databaseService.db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  /**
   * Activate user account
   */
  async activateUser(userId: string) {
    const [updatedUser] = await this.databaseService.db
      .update(users)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }
}
