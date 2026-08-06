import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, userPreferences } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';

@Injectable()
export class InterviewTimeHelper {
  private readonly logger = new Logger(InterviewTimeHelper.name);
  readonly defaultInterviewTimezone = 'Asia/Kolkata';

  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  // A scheduled/rescheduled interview time must be in the future.
  assertFutureDateTime(scheduledAt: Date, action: 'scheduled' | 'rescheduled') {
    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        `Interview cannot be ${action} in the past. Choose a future date and time.`,
      );
    }
  }

  // interviews.scheduledAt is `timestamp` WITHOUT time zone, storing the UTC
  // wall-clock of the instant. Format a Date the same way for comparisons —
  // binding a raw JS Date in untyped s`` gets cast as timestamptz and shifted by
  // the DB session timezone, which silently misses overlaps on non-UTC sessions.
  toUtcTimestampLiteral(d: Date) {
    return d.toISOString().slice(0, 23).replace('T', ' ');
  }

  formatInterviewDateTime(date: Date | string, timezone = this.defaultInterviewTimezone) {
    return new Date(date).toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  getDateTimeParts(date: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

    const hour = Number(parts.hour || '0') % 24;

    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour,
      minute: Number(parts.minute),
      second: Number(parts.second),
    };
  }

  getTimeZoneOffsetMs(date: Date, timezone: string) {
    const parts = this.getDateTimeParts(date, timezone);
    const zonedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    return zonedAsUtc - date.getTime();
  }

  createUtcDateFromZonedParts(
    parts: {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
      second: number;
    },
    timezone: string,
  ) {
    const utcGuess = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
    );
    const offset = this.getTimeZoneOffsetMs(utcGuess, timezone);
    const normalized = new Date(utcGuess.getTime() - offset);
    const normalizedOffset = this.getTimeZoneOffsetMs(normalized, timezone);

    return normalizedOffset === offset
      ? normalized
      : new Date(utcGuess.getTime() - normalizedOffset);
  }

  async getSchedulerTimezone(userId: string) {
    const prefs = await this.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    return prefs?.timezone || this.defaultInterviewTimezone;
  }

  async normalizeScheduledAt(userId: string, scheduledAt: string, interviewTimezone: string) {
    const parsedDate = new Date(scheduledAt);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid scheduledAt');
    }

    const schedulerTimezone = await this.getSchedulerTimezone(userId);
    if (!schedulerTimezone || schedulerTimezone === interviewTimezone) {
      return parsedDate;
    }

    try {
      const schedulerLocalParts = this.getDateTimeParts(parsedDate, schedulerTimezone);
      return this.createUtcDateFromZonedParts(schedulerLocalParts, interviewTimezone);
    } catch (error) {
      this.logger.warn(
        `Failed to normalize scheduledAt from ${schedulerTimezone} to ${interviewTimezone}: ${(error as Error).message}`,
      );
      return parsedDate;
    }
  }
}
