-- Redesign all 4 interview email templates:
-- 1. Replace raw meeting link URLs with "Join Meeting" / "Start Meeting" buttons
-- 2. Add "Add to Google Calendar" button to rescheduled templates
-- 3. Cleaner, professional layout with consistent card styling
-- 4. Previous time shown with strikethrough in rescheduled templates

-- ============================================================
-- 1. INTERVIEW_SCHEDULED (Candidate)
-- ============================================================
UPDATE "email_templates"
SET
  "content" = $body$Hi {{firstName}},

Your interview for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been confirmed. Please find the details below.

<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
<h3 style="margin:0 0 16px 0;color:#1e293b;font-size:16px;">Interview Details</h3>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:6px 0;color:#64748b;width:140px;font-size:14px;"><b>Date &amp; Time</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{interviewDate}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Duration</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{duration}} minutes</td></tr>
<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Interview Type</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{interviewType}}</td></tr>
{{#if interviewTool}}<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Platform</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{interviewTool}}</td></tr>{{/if}}
{{#if meetingPassword}}<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Password</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;"><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:14px;">{{meetingPassword}}</code></td></tr>{{/if}}
</table>
</div>

{{#if meetingLink}}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 12px 0;">
<tr><td style="border-radius:6px;background-color:#0ea5e9;"><a href="{{meetingLink}}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Join Meeting</a></td></tr>
</table>
{{/if}}

{{#if calendarLink}}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="border-radius:6px;background-color:#4285f4;"><a href="{{calendarLink}}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Add to Google Calendar</a></td></tr>
</table>
{{/if}}

Please be prepared and join on time. Good luck!$body$,
  "variables" = '["firstName","jobTitle","companyName","interviewDate","duration","interviewType","interviewTool","meetingLink","meetingPassword","calendarLink"]'::jsonb,
  "updated_at" = NOW()
WHERE "template_key" = 'INTERVIEW_SCHEDULED';

-- ============================================================
-- 2. EMPLOYER_INTERVIEW_SCHEDULED (Employer)
-- ============================================================
UPDATE "email_templates"
SET
  "content" = $body$Hi {{firstName}},

An interview has been scheduled with <strong>{{candidateName}}</strong> for the position of <strong>{{jobTitle}}</strong> at {{companyName}}.

<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;">
<h3 style="margin:0 0 16px 0;color:#1e293b;font-size:16px;">Interview Details</h3>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:6px 0;color:#64748b;width:140px;font-size:14px;"><b>Date &amp; Time</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{interviewDate}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Duration</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{duration}} minutes</td></tr>
<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Interview Type</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{interviewType}}</td></tr>
{{#if timezone}}<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Timezone</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{timezone}}</td></tr>{{/if}}
{{#if interviewTool}}<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Platform</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{interviewTool}}</td></tr>{{/if}}
{{#if meetingPassword}}<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Password</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;"><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:14px;">{{meetingPassword}}</code></td></tr>{{/if}}
</table>
</div>

<div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:20px 0;">
<p style="margin:0 0 4px 0;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Candidate</p>
<p style="margin:0;font-size:15px;color:#1e293b;">{{candidateName}} &nbsp;&middot;&nbsp; <a href="mailto:{{candidateEmail}}" style="color:#0ea5e9;text-decoration:none;">{{candidateEmail}}</a></p>
</div>

{{#if hostJoinUrl}}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 12px 0;"><tr><td style="border-radius:6px;background-color:#0ea5e9;"><a href="{{hostJoinUrl}}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Start Meeting</a></td></tr></table>{{else}}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 12px 0;"><tr><td style="border-radius:6px;background-color:#0ea5e9;"><a href="{{meetingLink}}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Join Meeting</a></td></tr></table>{{/if}}

{{#if calendarLink}}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="border-radius:6px;background-color:#4285f4;"><a href="{{calendarLink}}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Add to Google Calendar</a></td></tr>
</table>
{{/if}}

Please be available a few minutes before the scheduled time.$body$,
  "variables" = '["firstName","candidateName","candidateEmail","jobTitle","companyName","interviewDate","duration","interviewType","interviewTool","timezone","meetingLink","meetingPassword","hostJoinUrl","calendarLink"]'::jsonb,
  "updated_at" = NOW()
WHERE "template_key" = 'EMPLOYER_INTERVIEW_SCHEDULED';

-- ============================================================
-- 3. INTERVIEW_RESCHEDULED (Candidate) — add calendarLink + button layout
-- ============================================================
UPDATE "email_templates"
SET
  "content" = $body$Hi {{firstName}},

Your interview for <strong>{{jobTitle}}</strong> at <strong>{{companyName}}</strong> has been rescheduled. Please note the updated details below.

<div style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin:20px 0;">
<h3 style="margin:0 0 16px 0;color:#9a3412;font-size:16px;">Updated Schedule</h3>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:6px 0;color:#64748b;width:140px;font-size:14px;"><b>Previous Time</b></td><td style="padding:6px 0;color:#92400e;font-size:14px;text-decoration:line-through;">{{oldInterviewDate}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>New Time</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:bold;">{{interviewDate}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Duration</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{duration}} minutes</td></tr>
{{#if interviewTool}}<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Platform</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{interviewTool}}</td></tr>{{/if}}
{{#if meetingPassword}}<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Password</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;"><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:14px;">{{meetingPassword}}</code></td></tr>{{/if}}
{{#if reason}}<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Reason</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{reason}}</td></tr>{{/if}}
</table>
</div>

{{#if meetingLink}}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 12px 0;">
<tr><td style="border-radius:6px;background-color:#0ea5e9;"><a href="{{meetingLink}}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Join Meeting</a></td></tr>
</table>
{{/if}}

{{#if calendarLink}}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="border-radius:6px;background-color:#4285f4;"><a href="{{calendarLink}}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Add to Google Calendar</a></td></tr>
</table>
{{/if}}

Please update your calendar accordingly.$body$,
  "variables" = '["firstName","jobTitle","companyName","oldInterviewDate","interviewDate","duration","interviewTool","meetingLink","meetingPassword","reason","calendarLink"]'::jsonb,
  "updated_at" = NOW()
WHERE "template_key" = 'INTERVIEW_RESCHEDULED';

-- ============================================================
-- 4. EMPLOYER_INTERVIEW_RESCHEDULED (Employer) — add calendarLink + button layout
-- ============================================================
UPDATE "email_templates"
SET
  "content" = $body$Hi {{firstName}},

The interview with <strong>{{candidateName}}</strong> for the position of <strong>{{jobTitle}}</strong> has been rescheduled.

<div style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin:20px 0;">
<h3 style="margin:0 0 16px 0;color:#9a3412;font-size:16px;">Updated Schedule</h3>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:6px 0;color:#64748b;width:140px;font-size:14px;"><b>Previous Time</b></td><td style="padding:6px 0;color:#92400e;font-size:14px;text-decoration:line-through;">{{oldInterviewDate}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>New Time</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:bold;">{{interviewDate}}</td></tr>
<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Duration</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{duration}} minutes</td></tr>
{{#if interviewTool}}<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Platform</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{interviewTool}}</td></tr>{{/if}}
{{#if meetingPassword}}<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Password</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;"><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:14px;">{{meetingPassword}}</code></td></tr>{{/if}}
{{#if reason}}<tr><td style="padding:6px 0;color:#64748b;font-size:14px;"><b>Reason</b></td><td style="padding:6px 0;color:#1e293b;font-size:14px;">{{reason}}</td></tr>{{/if}}
</table>
</div>

{{#if hostJoinUrl}}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 12px 0;"><tr><td style="border-radius:6px;background-color:#0ea5e9;"><a href="{{hostJoinUrl}}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Start Meeting</a></td></tr></table>{{else}}<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 12px 0;"><tr><td style="border-radius:6px;background-color:#0ea5e9;"><a href="{{meetingLink}}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Join Meeting</a></td></tr></table>{{/if}}

{{#if calendarLink}}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
<tr><td style="border-radius:6px;background-color:#4285f4;"><a href="{{calendarLink}}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">Add to Google Calendar</a></td></tr>
</table>
{{/if}}

Please update your calendar accordingly.$body$,
  "variables" = '["firstName","candidateName","jobTitle","oldInterviewDate","interviewDate","duration","interviewTool","meetingLink","meetingPassword","hostJoinUrl","reason","calendarLink"]'::jsonb,
  "updated_at" = NOW()
WHERE "template_key" = 'EMPLOYER_INTERVIEW_RESCHEDULED';
