# EPIC-11: Interview Scheduling System

## Epic Overview
Implement a comprehensive interview scheduling system with calendar integration, automated multi-channel reminders, reschedule/cancel workflow, and interview feedback collection to streamline the hiring process.

---

## Business Value
- Reduce interview no-show rates
- Streamline scheduling process for employers
- Improve candidate experience
- Automate reminder communications
- Integrate with popular calendar systems
- Track interview outcomes for analytics

---

## User Stories

### US-11.1: Schedule Interview (Employer)
**As an** employer
**I want to** schedule interviews with candidates
**So that** I can move forward with the hiring process

**Acceptance Criteria:**
- "Schedule Interview" button on candidate profile
- Interview scheduling form:
  - **Candidate Selection:**
    - Pre-selected candidate
    - Option to add multiple candidates (batch scheduling)

  - **Interview Details:**
    - Job posting (dropdown)
    - Interview round (Screening/Technical/HR/Managerial/Final)
    - Interview title (optional)
    - Description/Agenda (optional)

  - **Date & Time:**
    - Date picker (calendar view)
    - Time picker with timezone
    - Duration (30min/45min/1hr/1.5hr/2hr/Custom)
    - Timezone display (employer's and candidate's if different)

  - **Interview Mode:**
    - In-person (requires location)
    - Phone call (requires phone number)
    - Video call (requires meeting link)

  - **Location/Link:**
    - Office address (if in-person)
    - Meeting room details
    - Video conferencing link (Zoom/Teams/Meet)
    - Phone number (if phone interview)

  - **Interviewer(s):**
    - Select from team members
    - Add external interviewers (email)
    - Interviewer panel (multiple interviewers)

  - **Additional Information:**
    - Instructions for candidate
    - Documents to bring
    - Preparation materials
    - Dress code (if applicable)

- Form validation (all required fields)
- Timezone conversion handling
- Conflict detection (interviewer availability)
- Save as draft option
- Send invitation button

---

### US-11.2: Calendar Integration
**As an** employer
**I want to** sync interviews with my calendar
**So that** I don't double-book

**Acceptance Criteria:**
- Calendar integration options:
  - Google Calendar
  - Microsoft Outlook Calendar
  - Apple Calendar (iCal)
  - ICS file download (generic)

- Google Calendar integration:
  - OAuth authentication
  - Create calendar event via API
  - Add attendees (interviewer and candidate)
  - Include meeting link and location
  - Set reminders
  - Two-way sync (update event if interview rescheduled)

- Outlook Calendar integration:
  - Microsoft Graph API authentication
  - Similar functionality as Google Calendar
  - Support Office 365 and Outlook.com

- ICS file generation:
  - Standard .ics format
  - Attach to interview invitation email
  - Can be imported to any calendar app
  - Includes all interview details

- Availability checking (optional):
  - Check interviewer's calendar availability
  - Suggest available time slots
  - Prevent overlapping interviews

---

### US-11.3: Send Interview Invitation
**As an** employer
**I want to** send interview invitations to candidates
**So that** they know when and where to attend

**Acceptance Criteria:**
- Interview invitation sent via:
  - Email (primary)
  - In-app notification
  - SMS (optional)
  - WhatsApp (optional)

- Email invitation includes:
  - Subject: "Interview Invitation: [Job Title] at [Company]"
  - Personalized greeting
  - Interview details:
    - Date and time (with timezone)
    - Duration
    - Interview mode and location/link
    - Interviewer name(s)
    - Job title
  - Instructions and preparation tips
  - Calendar invite attachment (.ics file)
  - Accept/Decline buttons (or link)
  - Reschedule request link
  - Contact information (if questions)
  - Company logo and branding

- Candidate actions:
  - Accept invitation (confirms attendance)
  - Decline invitation (with optional reason)
  - Request reschedule (propose new time)
  - Add to calendar (one-click)

- Interview status update:
  - Pending (invitation sent, awaiting response)
  - Confirmed (candidate accepted)
  - Declined (candidate declined)
  - Rescheduled (new time proposed/accepted)

---

### US-11.4: Automated Interview Reminders
**As a** candidate
**I want to** receive reminders about my interview
**So that** I don't forget or miss it

**Acceptance Criteria:**
- Multi-stage reminder system:
  - **24 hours before:**
    - Email
    - Push notification
    - SMS (optional)

  - **2 hours before:**
    - Email
    - Push notification
    - SMS (optional)

  - **30 minutes before (optional):**
    - Push notification only

- Reminder content:
  - Interview date and time
  - Location or meeting link
  - Interviewer name(s)
  - Preparation reminder
  - One-click access to:
    - Add to calendar
    - View interview details
    - Join video call (if applicable)
    - Get directions (if in-person)

- WhatsApp reminder (if enabled):
  - 24 hours before
  - Message with interview details
  - CTA button "Confirm Attendance"

- Reminder preferences:
  - User can opt-out of specific channels
  - Cannot opt-out of all reminders (at least email)

- Stop reminders if:
  - Interview canceled
  - Interview rescheduled (send new reminders)
  - Candidate declined

---

### US-11.5: Reschedule Interview
**As a** candidate or employer
**I want to** reschedule an interview
**So that** we can find a mutually convenient time

**Acceptance Criteria:**
- Candidate-initiated reschedule:
  - "Request Reschedule" link in invitation email
  - Reschedule form:
    - Reason for reschedule (optional)
    - Propose new date/time(s) (multiple options)
    - Message to employer
  - Submit request

- Employer-initiated reschedule:
  - "Reschedule" button on interview details
  - Update date/time directly
  - Reason for reschedule (optional)
  - Notify candidate

- Reschedule approval workflow:
  - Employer reviews candidate's request
  - Accept proposed time or suggest alternative
  - Candidate confirms new time

- Notifications:
  - Email to both parties
  - Update calendar events
  - Update interview status
  - Send new reminders for rescheduled time

- Reschedule limits:
  - Maximum 2-3 reschedules per interview
  - After that, require manual coordination

- Interview history:
  - Track all reschedule requests
  - Show original and updated dates
  - Audit trail

---

### US-11.6: Cancel Interview
**As a** candidate or employer
**I want to** cancel an interview
**So that** both parties are informed

**Acceptance Criteria:**
- Candidate-initiated cancel:
  - "Decline Interview" button
  - Cancellation reason (dropdown + optional text):
    - Accepted another offer
    - No longer interested in position
    - Personal reasons
    - Scheduling conflict
    - Other
  - Confirm cancellation

- Employer-initiated cancel:
  - "Cancel Interview" button
  - Cancellation reason (dropdown):
    - Position filled
    - Candidate not suitable
    - Budget/headcount changes
    - Other
  - Option to send message to candidate

- Cancellation notifications:
  - Email to both parties
  - In-app notification
  - SMS (optional)
  - Remove from calendars
  - Stop all reminders

- Interview status: "Canceled"
- Cannot be un-canceled (must reschedule as new)
- Cancellation tracked in analytics

---

### US-11.7: Join Video Interview
**As a** candidate or employer
**I want to** easily join video interviews
**So that** the process is seamless

**Acceptance Criteria:**
- Video conferencing integration:
  - Generate meeting links for:
    - Zoom
    - Microsoft Teams
    - Google Meet
    - Custom link (any platform)

- Zoom integration (if used):
  - Zoom API integration
  - Auto-create Zoom meeting
  - Generate meeting link and password
  - Include in interview invitation

- One-click join:
  - "Join Video Call" button in:
    - Interview details page
    - Email reminder
    - In-app notification
    - Mobile app
  - Opens meeting in browser or app

- Pre-interview check:
  - Test camera and microphone
  - "Join 10 minutes early" option
  - Waiting room (if supported)

- Meeting details:
  - Meeting link
  - Meeting ID
  - Password (if required)
  - Dial-in numbers (for audio backup)

- Mobile support:
  - Deep linking to Zoom/Teams/Meet app
  - Fallback to web browser

---

### US-11.8: Interview Confirmation & Attendance Tracking
**As an** employer
**I want to** track interview confirmations and attendance
**So that** I know who will attend

**Acceptance Criteria:**
- Interview status tracking:
  - Pending (invitation sent, no response)
  - Confirmed (candidate accepted)
  - Declined (candidate declined)
  - Completed (interview finished)
  - No-show (candidate didn't attend)
  - Canceled

- Candidate confirmation:
  - "Confirm Attendance" button in email
  - One-click confirmation (no login required for email link)
  - Confirmation timestamp recorded

- Attendance tracking:
  - Mark as "Attended" or "No-show" after interview
  - Employer manually updates status
  - Auto-mark as "Completed" if feedback submitted

- No-show handling:
  - Flag candidate as no-show
  - Option to send follow-up message
  - Record in candidate's application history
  - Analytics on no-show rate

- Dashboard for employer:
  - Upcoming interviews
  - Pending confirmations
  - Attendance statistics

---

### US-11.9: Interview Feedback & Evaluation
**As an** interviewer
**I want to** submit feedback after an interview
**So that** hiring decisions are data-driven

**Acceptance Criteria:**
- Post-interview feedback form:
  - Overall rating (1-5 stars or 1-10 scale)
  - Strengths (text area)
  - Weaknesses (text area)
  - Technical skills assessment:
    - Skill-by-skill rating
    - Coding test results (if applicable)
  - Cultural fit assessment
  - Communication skills rating
  - Problem-solving ability rating
  - Recommendation:
    - Strong Yes
    - Yes
    - Maybe
    - No
    - Strong No
  - Next steps:
    - Proceed to next round
    - Reject
    - Hold decision
  - Additional notes (private)

- Feedback visibility:
  - Only hiring team members can view
  - Aggregated feedback if multiple interviewers
  - Feedback stored in candidate's application

- Feedback reminders:
  - Email reminder 2 hours after interview
  - Daily reminder if not submitted
  - Deadline (e.g., 48 hours after interview)

- Feedback templates:
  - Role-specific templates
  - Customizable criteria
  - Standard questions

- Collaborative decision:
  - All interviewers submit feedback
  - Discussion thread for hiring team
  - Final decision by hiring manager

---

### US-11.10: Interview History & Timeline
**As a** candidate
**I want to** view my interview history
**So that** I can track my progress

**Acceptance Criteria:**
- Interview history page in candidate dashboard:
  - List of all interviews (past and upcoming)
  - Filter by status (Scheduled/Completed/Canceled)
  - Search by company or job title

- Interview card displays:
  - Company name and logo
  - Job title
  - Interview date and time
  - Interview round
  - Status (Upcoming/Completed/Canceled/No-show)
  - Feedback received (if any, high-level)

- Interview details view:
  - Full interview information
  - Location/meeting link
  - Interviewer names
  - Preparation materials
  - Post-interview notes (candidate's own)
  - Outcome (if decision made)

- Timeline visualization:
  - Application → Interview → Decision
  - Track progress through hiring stages
  - Next expected step

---

### US-11.11: Interview Analytics (Employer)
**As an** employer
**I want to** view interview analytics
**So that** I can optimize the hiring process

**Acceptance Criteria:**
- Interview analytics dashboard:
  - **Volume Metrics:**
    - Total interviews scheduled
    - Interviews per job posting
    - Interviews per month/week
    - Interview rounds distribution

  - **Attendance Metrics:**
    - Confirmation rate
    - No-show rate (by round, by source)
    - Average no-show rate

  - **Scheduling Metrics:**
    - Average time to schedule (application → interview)
    - Reschedule rate
    - Cancellation rate

  - **Outcome Metrics:**
    - Interview → offer rate
    - Interview → hire rate
    - Average feedback rating
    - Pass rate by interview round

  - **Time Metrics:**
    - Average interview duration
    - Time between interview rounds
    - Time to decision (post-interview)

- Filters:
  - Date range
  - Job posting
  - Interview round
  - Interviewer

- Insights and recommendations:
  - "Your no-show rate is 15% higher than average"
  - "Send reminders 24h before to reduce no-shows"

- Export reports (CSV, PDF)

---

### US-11.12: Bulk Interview Scheduling
**As an** employer
**I want to** schedule multiple interviews at once
**So that** I can save time

**Acceptance Criteria:**
- Bulk scheduling interface:
  - Select multiple candidates (checkboxes)
  - Choose scheduling mode:
    - Same time for all (group interview)
    - Different times (sequential scheduling)
    - Auto-schedule (system suggests times)

- Auto-schedule feature:
  - Define interviewer availability (time blocks)
  - Define interview duration
  - System auto-assigns time slots
  - Avoid conflicts
  - Sequential or parallel scheduling

- Batch invitation:
  - Send invitations to all candidates
  - Personalized emails (candidate name)
  - Bulk calendar events

- Review before sending:
  - Preview schedule
  - Adjust individual times if needed
  - Confirm and send

- Bulk actions:
  - Reschedule multiple interviews
  - Cancel multiple interviews
  - Send reminder to all

---

### US-11.13: Interview Templates
**As an** employer
**I want** interview templates
**So that** I can quickly schedule similar interviews

**Acceptance Criteria:**
- Create interview template:
  - Template name
  - Interview round
  - Duration
  - Mode (in-person/phone/video)
  - Default location/link
  - Interviewer panel
  - Instructions template
  - Feedback form template

- Save template
- Use template when scheduling:
  - Select template from dropdown
  - Auto-populate fields
  - Customize as needed

- Template library:
  - Company-wide templates
  - Personal templates
  - Clone and edit templates

- Default template per job posting
- Template management:
  - Edit templates
  - Delete templates
  - Share with team

---

### US-11.14: Interview Availability Calendar
**As an** employer
**I want** a calendar view of interview availability
**So that** I can optimize scheduling

**Acceptance Criteria:**
- Calendar view showing:
  - All scheduled interviews
  - Interviewer availability
  - Interview room bookings (if in-person)
  - Color-coded by status/round

- Calendar modes:
  - Day view
  - Week view
  - Month view

- Drag-and-drop reschedule:
  - Drag interview to new slot
  - Check conflicts
  - Update automatically

- Availability management:
  - Mark time slots as available/unavailable
  - Block out time (meetings, vacation)
  - Share availability with team

- Room/resource booking (optional):
  - Conference room booking
  - Equipment reservation
  - Integration with room booking systems

---

### US-11.15: Interview Experience Rating
**As a** candidate
**I want to** rate my interview experience
**So that** I can provide feedback

**Acceptance Criteria:**
- Post-interview survey (sent after interview):
  - Overall experience rating (1-5 stars)
  - Professionalism of interviewer
  - Clarity of communication
  - Timeliness (started on time)
  - Process organization
  - Would you recommend this company? (Yes/No)
  - Comments (optional)

- Survey delivery:
  - Email 24 hours after interview
  - In-app notification
  - Optional (can skip)

- Anonymous feedback option
- Employer can view aggregated feedback
- Platform uses data to improve employer ratings

---

## Technical Requirements

### Calendar Integration
- **Google Calendar API:** OAuth 2.0, event creation/update/delete
- **Microsoft Graph API:** OAuth 2.0, calendar operations
- **ICS File Generation:** RFC 5545 compliant

### Notification System
- **Email:** SendGrid, AWS SES
- **SMS:** Twilio, MSG91
- **WhatsApp:** WhatsApp Business API
- **Push Notifications:** Firebase Cloud Messaging

### Database Schema

**Interviews Table:**
```sql
interviews (
  id: UUID PRIMARY KEY,
  application_id: UUID FOREIGN KEY REFERENCES applications(id),
  job_id: UUID FOREIGN KEY REFERENCES jobs(id),
  candidate_id: UUID FOREIGN KEY REFERENCES users(id),
  employer_id: UUID FOREIGN KEY REFERENCES users(id),
  scheduled_by: UUID FOREIGN KEY REFERENCES users(id),
  interview_round: ENUM('screening', 'technical', 'hr', 'managerial', 'final'),
  title: VARCHAR(255),
  description: TEXT,
  interview_mode: ENUM('in_person', 'phone', 'video'),
  interview_date: TIMESTAMP,
  duration_minutes: INTEGER,
  timezone: VARCHAR(50),
  location: VARCHAR(500),
  meeting_link: VARCHAR(500),
  meeting_password: VARCHAR(100),
  instructions: TEXT,
  interviewers: JSONB,
  status: ENUM('pending', 'confirmed', 'declined', 'completed', 'canceled', 'no_show', 'rescheduled'),
  confirmation_status: ENUM('pending', 'confirmed', 'declined'),
  confirmed_at: TIMESTAMP,
  canceled_at: TIMESTAMP,
  cancellation_reason: VARCHAR(500),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Interview Reminders Table:**
```sql
interview_reminders (
  id: UUID PRIMARY KEY,
  interview_id: UUID FOREIGN KEY REFERENCES interviews(id),
  reminder_type: ENUM('24h_before', '2h_before', '30m_before'),
  channels: JSONB,
  scheduled_at: TIMESTAMP,
  sent_at: TIMESTAMP,
  status: ENUM('pending', 'sent', 'failed'),
  created_at: TIMESTAMP
)
```

**Interview Feedback Table:**
```sql
interview_feedback (
  id: UUID PRIMARY KEY,
  interview_id: UUID FOREIGN KEY REFERENCES interviews(id),
  interviewer_id: UUID FOREIGN KEY REFERENCES users(id),
  overall_rating: INTEGER,
  strengths: TEXT,
  weaknesses: TEXT,
  skills_assessment: JSONB,
  cultural_fit: INTEGER,
  communication_skills: INTEGER,
  problem_solving: INTEGER,
  recommendation: ENUM('strong_yes', 'yes', 'maybe', 'no', 'strong_no'),
  next_steps: ENUM('next_round', 'reject', 'hold'),
  notes: TEXT,
  submitted_at: TIMESTAMP,
  created_at: TIMESTAMP
)
```

**Interview Reschedules Table:**
```sql
interview_reschedules (
  id: UUID PRIMARY KEY,
  interview_id: UUID FOREIGN KEY REFERENCES interviews(id),
  requested_by: UUID FOREIGN KEY REFERENCES users(id),
  original_date: TIMESTAMP,
  proposed_dates: JSONB,
  new_date: TIMESTAMP,
  reason: VARCHAR(500),
  status: ENUM('pending', 'approved', 'rejected'),
  created_at: TIMESTAMP,
  resolved_at: TIMESTAMP
)
```

---

## API Endpoints

```
# Interview Scheduling
POST   /api/v1/interviews                      - Schedule interview
GET    /api/v1/interviews                      - List interviews
GET    /api/v1/interviews/:id                  - Get interview details
PUT    /api/v1/interviews/:id                  - Update interview
DELETE /api/v1/interviews/:id                  - Cancel interview

# Interview Actions
PUT    /api/v1/interviews/:id/confirm          - Confirm attendance
PUT    /api/v1/interviews/:id/decline          - Decline interview
POST   /api/v1/interviews/:id/reschedule       - Request reschedule
PUT    /api/v1/interviews/:id/reschedule/:reqId/approve - Approve reschedule request

# Interview Feedback
POST   /api/v1/interviews/:id/feedback         - Submit feedback
GET    /api/v1/interviews/:id/feedback         - Get feedback

# Calendar Integration
POST   /api/v1/interviews/:id/calendar/google  - Add to Google Calendar
POST   /api/v1/interviews/:id/calendar/outlook - Add to Outlook Calendar
GET    /api/v1/interviews/:id/calendar/ics     - Download ICS file

# Analytics
GET    /api/v1/employer/interviews/analytics   - Get interview analytics
```

---

## UI/UX Requirements

### Scheduling Form
- Multi-step wizard
- Clear labels and help text
- Timezone selector
- Date/time picker (intuitive)
- Preview before sending

### Calendar View
- Clean, modern calendar UI
- Color-coded events
- Quick actions on hover
- Responsive design

### Email Templates
- Professional design
- Clear call-to-action buttons
- Mobile-responsive
- Calendar attachment

---

## Testing Requirements

### Unit Tests
- Date/time calculations
- Timezone conversions
- Reminder scheduling logic
- Calendar event generation

### Integration Tests
- Google Calendar API
- Outlook Calendar API
- Email delivery
- SMS delivery
- Push notifications

### E2E Tests
- Complete scheduling flow
- Reschedule workflow
- Cancellation workflow
- Feedback submission

---

## Success Metrics

- Interview no-show rate < 10%
- Interview confirmation rate > 85%
- Reschedule request rate < 15%
- Reminder open rate (email) > 60%
- Calendar integration adoption > 50%
- Employer satisfaction with scheduling > 4.3/5
- Candidate satisfaction with process > 4.2/5

---

## Acceptance Criteria (Epic Level)

- [ ] Interview scheduling form functional
- [ ] Calendar integrations working (Google, Outlook)
- [ ] Interview invitations sent successfully
- [ ] Automated reminders delivered on schedule
- [ ] Reschedule workflow functional
- [ ] Cancel workflow functional
- [ ] Video interview join links working
- [ ] Attendance tracking implemented
- [ ] Feedback form functional
- [ ] Interview history accessible
- [ ] Analytics dashboard complete
- [ ] Bulk scheduling working
- [ ] All notifications tested
- [ ] Performance benchmarks met

---

## Timeline Estimate
**Duration:** 4-5 weeks

### Week 1: Core Scheduling
- Scheduling form
- Database schema
- Basic invitation emails
- Interview management

### Week 2: Calendar Integration
- Google Calendar API
- Outlook Calendar API
- ICS file generation
- Two-way sync

### Week 3: Reminders & Notifications
- Reminder scheduling
- Multi-channel delivery
- Reschedule workflow
- Cancel workflow

### Week 4: Feedback & Analytics
- Feedback forms
- Attendance tracking
- Analytics dashboard
- Bulk scheduling

### Week 5: Testing & Optimization
- Integration testing
- User acceptance testing
- Performance optimization
- Documentation

---

## Related Epics
- EPIC-04: Employer Job Posting (interview scheduling for applicants)
- EPIC-06: Notifications (interview reminders)
- EPIC-12: Messaging (interview-related communication)

---

**Epic Owner:** Backend Team Lead
**Stakeholders:** Product Manager, Frontend Team, Integrations Team, QA
**Priority:** High (Critical for hiring workflow)
