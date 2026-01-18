import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { db, otps } from '@ai-job-portal/database';
import { lt } from 'drizzle-orm';

@Injectable()
export class OtpCleanupService {
  private readonly logger = new Logger(OtpCleanupService.name);

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleCleanup() {
    this.logger.log('Starting daily OTP cleanup...');

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await db
        .delete(otps)
        .where(lt(otps.createdAt, twentyFourHoursAgo))
        .returning(); // Use returning to get deleted rows if supported, or just executing

      // Note: If the driver supports returning count, use it.
      // PostgresJS usually returns an array of deleted rows with returning()

      const deletedCount = result.length;

      this.logger.log(`OTP cleanup executed. Deleted ${deletedCount} old records.`);
    } catch (error) {
      this.logger.error('Failed to execute OTP cleanup', error);
      // Fail silently to not crash the application
    }
  }
}
