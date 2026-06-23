-- Interview mode enum: rename 'offline' -> 'on_site' (in-place, existing rows keep
-- their value automatically) and add new 'phone' mode.
-- Hand-written: drizzle-kit would drop & recreate the enum, which is unsafe while
-- the interviews.interview_mode column references it.
ALTER TYPE "interview_mode" RENAME VALUE 'offline' TO 'on_site';
--> statement-breakpoint
ALTER TYPE "interview_mode" ADD VALUE IF NOT EXISTS 'phone';
