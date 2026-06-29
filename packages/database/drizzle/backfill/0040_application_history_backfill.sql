-- One-time best-effort backfill for application_history after migration 0040
-- (event_type / interview_id / metadata).
--
-- Run AFTER 0040_open_spiral.sql is applied. Idempotent: only touches rows
-- whose new columns are still NULL. Test on dev RDS first, then staging.
--   psql "$DATABASE_URL" -f drizzle/backfill/0040_application_history_backfill.sql

BEGIN;

-- 1) Derive event_type from the recorded application status.
--    Cast to text: literals like 'offered' are not valid application_status enum
--    values, so an un-cast comparison would force a failing enum cast.
UPDATE application_history
SET event_type = CASE new_status::text
    WHEN 'applied' THEN 'application_submitted'
    WHEN 'viewed' THEN 'application_viewed'
    WHEN 'shortlisted' THEN 'shortlisted'
    WHEN 'interview_scheduled' THEN 'interview_scheduled'
    WHEN 'interview_rescheduled' THEN 'interview_rescheduled'
    WHEN 'interview_cancelled' THEN 'interview_cancelled'
    WHEN 'interview_in_progress' THEN 'interview_round_completed'
    WHEN 'interview_completed' THEN 'interview_completed'
    WHEN 'offered' THEN 'offer_made'
    WHEN 'offer_accepted' THEN 'offer_accepted'
    WHEN 'offer_rejected' THEN 'offer_rejected'
    WHEN 'hired' THEN 'hired'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'withdrawn' THEN 'withdrawn'
    ELSE 'status_changed'
  END
WHERE event_type IS NULL;

-- 2) Link interview-related rows to the closest interview on the same
--    application (by created_at proximity). Best-effort for legacy rows.
UPDATE application_history ah
SET interview_id = sub.interview_id
FROM (
  SELECT DISTINCT ON (h.id) h.id AS hist_id, i.id AS interview_id
  FROM application_history h
  JOIN interviews i ON i.application_id = h.application_id
  WHERE h.interview_id IS NULL
    AND h.new_status IN (
      'interview_scheduled', 'interview_rescheduled', 'interview_cancelled',
      'interview_in_progress', 'interview_completed'
    )
  ORDER BY h.id, abs(extract(epoch FROM (i.created_at - h.created_at)))
) sub
WHERE ah.id = sub.hist_id;

-- 3) Lift reschedule/cancel reasons out of the legacy free-text comment into
--    structured metadata so the timeline can show them cleanly.
UPDATE application_history
SET metadata = jsonb_build_object('reason', nullif(trim(split_part(comment, 'Reason:', 2)), ''))
WHERE metadata IS NULL
  AND event_type = 'interview_rescheduled'
  AND comment LIKE '%Reason:%';

UPDATE application_history
SET metadata = jsonb_build_object('reason', nullif(trim(substring(comment FROM 'Interview cancelled: (.*)')), ''))
WHERE metadata IS NULL
  AND event_type = 'interview_cancelled'
  AND comment LIKE 'Interview cancelled: %';

COMMIT;
