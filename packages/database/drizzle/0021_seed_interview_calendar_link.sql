-- Add "Add to Google Calendar" button to interview email templates
-- Safe to run multiple times: only patches if calendarLink is not already present

-- 1. INTERVIEW_SCHEDULED (candidate) — add calendarLink to variables + content
UPDATE "email_templates"
SET
  "variables" = COALESCE("variables", '[]'::jsonb) || '["calendarLink"]'::jsonb,
  "content" = REPLACE(
    "content",
    'Please be prepared and join on time. Good luck!',
    E'\n\n{{#if calendarLink}}\n<div style="text-align:center;margin:20px 0;">\n<a href="{{calendarLink}}" target="_blank" style="display:inline-block;padding:12px 24px;background-color:#4285f4;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;">Add to Google Calendar</a>\n</div>\n{{/if}}\n\nPlease be prepared and join on time. Good luck!'
  ),
  "updated_at" = NOW()
WHERE "template_key" = 'INTERVIEW_SCHEDULED'
  AND "content" NOT LIKE '%calendarLink%';

-- 2. EMPLOYER_INTERVIEW_SCHEDULED — add calendarLink to variables + content
UPDATE "email_templates"
SET
  "variables" = COALESCE("variables", '[]'::jsonb) || '["calendarLink"]'::jsonb,
  "content" = REPLACE(
    "content",
    'Please be available a few minutes before the scheduled time.',
    E'\n\n{{#if calendarLink}}\n<div style="text-align:center;margin:20px 0;">\n<a href="{{calendarLink}}" target="_blank" style="display:inline-block;padding:12px 24px;background-color:#4285f4;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;">Add to Google Calendar</a>\n</div>\n{{/if}}\n\nPlease be available a few minutes before the scheduled time.'
  ),
  "updated_at" = NOW()
WHERE "template_key" = 'EMPLOYER_INTERVIEW_SCHEDULED'
  AND "content" NOT LIKE '%calendarLink%';
