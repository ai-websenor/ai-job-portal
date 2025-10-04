# EPIC-18: Team Collaboration Tools

## Epic Overview
Implement comprehensive team collaboration features for employer accounts including multi-user access, role-based permissions, task management, activity logs, team notifications, and collaborative hiring workflows.

---

## Business Value
- Enable team-based hiring decisions
- Improve hiring workflow efficiency
- Ensure accountability and transparency
- Support growing organizations
- Reduce hiring coordination overhead
- Track team activities for compliance

---

## User Stories

### US-18.1: Team Member Invitation
**As an** employer admin
**I want** to invite team members
**So that** we can collaborate on hiring

**Acceptance Criteria:**
- Invite team members via email
- Invitation form:
  - Email address
  - First and last name
  - Role assignment (dropdown)
  - Permissions preview
  - Welcome message (optional)
- Send invitation email
- Invitation link (valid 7 days)
- Resend invitation option
- Revoke pending invitation
- Track invitation status (sent, accepted, expired)

### US-18.2: Role-Based Access Control (RBAC)
**As an** employer admin
**I want** to assign roles with specific permissions
**So that** team members have appropriate access

**Acceptance Criteria:**
- Predefined roles:
  - **Admin:** Full access (all permissions)
  - **Recruiter:** Post jobs, manage applicants, schedule interviews
  - **Hiring Manager:** View applicants, provide feedback, approve hires
  - **Interviewer:** View assigned candidates, submit feedback
  - **Viewer:** Read-only access (reports, analytics)
- Custom role creation (optional)
- Permissions matrix:
  - Post/edit/delete jobs
  - View applicants
  - Shortlist/reject candidates
  - Schedule interviews
  - Access analytics
  - Manage billing
  - Invite team members
  - Manage team settings
- Assign role to team member
- Change role anytime
- Remove team member

### US-18.3: Team Dashboard
**As a** team member
**I want** a team dashboard
**So that** I see my tasks and updates

**Acceptance Criteria:**
- Team dashboard showing:
  - Assigned tasks
  - Pending actions (candidates to review)
  - Upcoming interviews
  - Team messages/notifications
  - Recent activity feed
  - My jobs (assigned to me)
- Filter by status, date, priority
- Quick actions (shortlist, schedule, comment)
- Notifications badge

### US-18.4: Task Assignment
**As an** employer admin or recruiter
**I want** to assign tasks to team members
**So that** work is distributed

**Acceptance Criteria:**
- Create task:
  - Task title and description
  - Assign to team member
  - Due date
  - Priority (high, medium, low)
  - Related to (job, candidate, interview)
  - Attachments (optional)
- Task types:
  - Review candidate
  - Schedule interview
  - Conduct interview
  - Submit feedback
  - Follow up with candidate
  - Custom tasks
- Task status:
  - Open
  - In Progress
  - Completed
  - Canceled
- Task notifications (email + in-app)
- Task reminders (before due date)
- Mark task complete
- Reassign task
- Task comments/discussion

### US-18.5: Team Notifications & @Mentions
**As a** team member
**I want** to be notified of relevant activities
**So that** I stay informed

**Acceptance Criteria:**
- Notifications for:
  - Task assigned to me
  - @mentioned in comment
  - Candidate shortlisted (if I'm interviewer)
  - Interview scheduled with me
  - Team member action on my job
  - Job application received (if assigned)
- @mention functionality:
  - Type @ to see team member list
  - Select team member
  - They receive notification
  - Click notification → go to context
- Notification preferences per type
- Daily digest option
- Mute specific jobs/tasks

### US-18.6: Collaborative Candidate Evaluation
**As a** team member
**I want** to collaborate on candidate evaluation
**So that** we make better hiring decisions

**Acceptance Criteria:**
- Comment threads on candidate profile
- Tag team members in comments
- Reply to comments
- Edit/delete own comments
- Timestamp and author for each comment
- Attach files to comments
- Mark comment as important
- Internal notes (not visible to candidate)
- Rating aggregation (if multiple interviewers)
- Discussion history preserved

### US-18.7: Activity Logs & Audit Trail
**As an** employer admin
**I want** to view activity logs
**So that** I track team actions

**Acceptance Criteria:**
- Activity log showing:
  - Who performed action
  - What action (shortlisted, rejected, commented, etc.)
  - When (timestamp)
  - On which job/candidate
  - Before/after values (for edits)
- Filter by:
  - Team member
  - Action type
  - Date range
  - Job or candidate
- Search activity logs
- Export to CSV
- Compliance and audit purposes
- Retention policy (keep 2 years)

### US-18.8: Shared Notes & Documentation
**As a** team member
**I want** to create shared notes
**So that** knowledge is centralized

**Acceptance Criteria:**
- Create notes:
  - Note title
  - Rich text content
  - Attach files
  - Tag team members
  - Link to jobs/candidates
- Note categories:
  - Interview templates
  - Screening criteria
  - Company policies
  - Salary guidelines
  - Best practices
- Search notes
- Pin important notes
- Edit history
- Version control

### US-18.9: Team Calendar
**As a** team member
**I want** a shared team calendar
**So that** I see all interviews and events

**Acceptance Criteria:**
- Calendar view (day, week, month)
- Display:
  - All team interviews
  - Team meetings (optional)
  - Deadlines
  - Application deadlines
- Color-coded by:
  - Interview round
  - Interviewer
  - Job posting
- Click event → view details
- Filter by team member
- Sync with personal calendar
- Export calendar

### US-18.10: Team Performance Analytics
**As an** employer admin
**I want** team performance metrics
**So that** I measure productivity

**Acceptance Criteria:**
- Metrics per team member:
  - Jobs managed
  - Candidates reviewed
  - Interviews conducted
  - Time to action (review/shortlist)
  - Feedback quality rating
  - Tasks completed on time
  - Average time to fill
  - Hire rate
- Team-wide metrics:
  - Total hires
  - Average time to hire
  - Collaboration score
  - Candidate experience rating
- Leaderboards (optional, gamification)
- Export reports
- Filters (date range, job category)

---

## Technical Requirements

### Database Schema

**Team Members Table:**
```sql
team_members (
  id: UUID PRIMARY KEY,
  company_id: UUID FOREIGN KEY,
  user_id: UUID FOREIGN KEY,
  role: ENUM('admin', 'recruiter', 'hiring_manager', 'interviewer', 'viewer'),
  permissions: JSONB,
  invited_by: UUID FOREIGN KEY,
  invited_at: TIMESTAMP,
  joined_at: TIMESTAMP,
  is_active: BOOLEAN,
  created_at: TIMESTAMP
)
```

**Tasks Table:**
```sql
tasks (
  id: UUID PRIMARY KEY,
  company_id: UUID FOREIGN KEY,
  created_by: UUID FOREIGN KEY,
  assigned_to: UUID FOREIGN KEY,
  title: VARCHAR(255),
  description: TEXT,
  related_to_type: ENUM('job', 'candidate', 'interview'),
  related_to_id: UUID,
  priority: ENUM('high', 'medium', 'low'),
  status: ENUM('open', 'in_progress', 'completed', 'canceled'),
  due_date: DATE,
  completed_at: TIMESTAMP,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Comments Table:**
```sql
comments (
  id: UUID PRIMARY KEY,
  company_id: UUID FOREIGN KEY,
  author_id: UUID FOREIGN KEY,
  parent_id: UUID FOREIGN KEY,
  entity_type: ENUM('candidate', 'job', 'task', 'note'),
  entity_id: UUID,
  comment_text: TEXT,
  mentions: JSONB,
  is_important: BOOLEAN,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Activity Logs Table:**
```sql
activity_logs (
  id: UUID PRIMARY KEY,
  company_id: UUID FOREIGN KEY,
  user_id: UUID FOREIGN KEY,
  action: VARCHAR(100),
  entity_type: VARCHAR(50),
  entity_id: UUID,
  changes: JSONB,
  ip_address: VARCHAR(45),
  user_agent: TEXT,
  created_at: TIMESTAMP
)
```

---

## API Endpoints

```
# Team Management
POST   /api/v1/team/invite                 - Invite team member
GET    /api/v1/team                        - List team members
PUT    /api/v1/team/:id/role               - Update role
DELETE /api/v1/team/:id                    - Remove team member

# Tasks
POST   /api/v1/tasks                       - Create task
GET    /api/v1/tasks                       - List tasks
PUT    /api/v1/tasks/:id                   - Update task
DELETE /api/v1/tasks/:id                   - Delete task

# Comments
POST   /api/v1/comments                    - Add comment
GET    /api/v1/comments                    - Get comments
PUT    /api/v1/comments/:id                - Edit comment
DELETE /api/v1/comments/:id                - Delete comment

# Activity Logs
GET    /api/v1/activity-logs               - Get activity logs

# Team Analytics
GET    /api/v1/team/analytics               - Team performance metrics
```

---

## Success Metrics

- Team collaboration adoption > 70%
- Average team size per employer > 3
- Task completion rate > 85%
- Team member satisfaction > 4.2/5
- Reduction in hiring coordination time by 30%

---

## Timeline Estimate
**Duration:** 4-5 weeks

### Week 1: Foundation
- Team invitation system
- RBAC implementation
- Database schema
- Basic permissions

### Week 2: Collaboration Features
- Task management
- Comments and mentions
- Activity logs
- Notifications

### Week 3: Advanced Features
- Shared notes
- Team calendar
- Team analytics
- Performance metrics

### Week 4-5: Testing & Launch
- Integration testing
- User acceptance testing
- Documentation
- Training materials

---

## Related Epics
- EPIC-04: Employer Job Posting (team collaboration on hiring)
- EPIC-11: Interview Scheduling (team interviews)
- EPIC-15: Analytics (team performance)

---

**Epic Owner:** Full-Stack Team Lead
**Priority:** Medium (Enterprise feature)
