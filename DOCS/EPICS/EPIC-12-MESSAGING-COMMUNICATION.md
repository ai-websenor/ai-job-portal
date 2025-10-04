# EPIC-12: Messaging & Communication

## Epic Overview
Implement a comprehensive in-platform messaging system enabling direct communication between employers and candidates with thread management, real-time notifications, file attachments, and message templates.

---

## Business Value
- Facilitate direct employer-candidate communication
- Reduce dependence on external email
- Improve response rates and hiring speed
- Track communication history
- Enable better candidate engagement

---

## User Stories

### US-12.1: Send Direct Message
**As an** employer or candidate
**I want to** send messages to other users
**So that** I can communicate about applications

**Acceptance Criteria:**
- Message composer interface
- Rich text editor with formatting
- Character limit (5000 chars)
- File attachments (documents, images)
- Send and save as draft
- Real-time delivery
- Read receipts
- Typing indicators

### US-12.2: Message Threads
**As a** user
**I want** threaded conversations
**So that** I can track discussion history

**Acceptance Criteria:**
- Thread-based conversations
- Messages grouped by conversation
- Participant list
- Thread search
- Archive threads
- Unread count per thread
- Last message preview

### US-12.3: Message Notifications
**As a** user
**I want** notifications for new messages
**So that** I respond promptly

**Acceptance Criteria:**
- Real-time push notifications
- Email notifications
- SMS notifications (optional)
- Notification preferences
- Mute conversations
- Do not disturb mode

### US-12.4: Message Templates
**As an** employer
**I want** message templates
**So that** I can respond quickly

**Acceptance Criteria:**
- Template library
- Create/edit/delete templates
- Categorize templates
- Insert template into message
- Customize before sending
- Shared team templates

### US-12.5: File Attachments
**As a** user
**I want to** attach files to messages
**So that** I can share documents

**Acceptance Criteria:**
- Attach multiple files
- Supported formats (PDF, DOC, images)
- Max 10MB per file
- Preview attachments
- Download attachments
- Virus scanning

### US-12.6: Message Search
**As a** user
**I want to** search my messages
**So that** I can find past conversations

**Acceptance Criteria:**
- Full-text search
- Filter by sender/date
- Search within thread
- Highlight search terms
- Recent searches
- Advanced filters

### US-12.7: Bulk Messaging
**As an** employer
**I want** to message multiple candidates
**So that** I can communicate efficiently

**Acceptance Criteria:**
- Select multiple recipients
- Personalized variables
- Send individually (not group)
- Track delivery status
- Opt-out handling
- Rate limiting

### US-12.8: Auto-Responses
**As a** user
**I want** automated responses
**So that** senders know I'm unavailable

**Acceptance Criteria:**
- Set auto-response message
- Enable/disable auto-response
- Schedule availability
- Vacation mode
- Custom messages

### US-12.9: Message Analytics
**As an** employer
**I want** messaging analytics
**So that** I can track engagement

**Acceptance Criteria:**
- Response rate
- Average response time
- Messages sent/received
- Conversation volume
- Candidate engagement metrics

### US-12.10: Block/Report Users
**As a** user
**I want to** block or report inappropriate messages
**So that** I maintain safety

**Acceptance Criteria:**
- Block user option
- Report spam/harassment
- Admin review system
- Unblock option
- Privacy controls

---

## Technical Requirements

### Real-Time Communication
- WebSocket for real-time messaging
- Fallback to polling
- Message queue (RabbitMQ, Redis)
- Push notification service

### Database Schema

**Messages Table:**
```sql
messages (
  id: UUID PRIMARY KEY,
  thread_id: UUID FOREIGN KEY,
  sender_id: UUID FOREIGN KEY,
  recipient_id: UUID FOREIGN KEY,
  subject: VARCHAR(255),
  body: TEXT,
  attachments: JSONB,
  is_read: BOOLEAN,
  read_at: TIMESTAMP,
  created_at: TIMESTAMP
)
```

**Message Threads Table:**
```sql
message_threads (
  id: UUID PRIMARY KEY,
  participants: JSONB,
  job_id: UUID,
  application_id: UUID,
  last_message_at: TIMESTAMP,
  is_archived: BOOLEAN,
  created_at: TIMESTAMP
)
```

---

## API Endpoints

```
POST   /api/v1/messages                 - Send message
GET    /api/v1/messages                 - List messages
GET    /api/v1/messages/:id             - Get message
PUT    /api/v1/messages/:id/read        - Mark as read
DELETE /api/v1/messages/:id             - Delete message

GET    /api/v1/threads                  - List threads
GET    /api/v1/threads/:id              - Get thread messages
PUT    /api/v1/threads/:id/archive      - Archive thread
```

---

## Success Metrics

- Message response rate > 70%
- Average response time < 24 hours
- User adoption > 60%
- Spam report rate < 2%

---

## Timeline Estimate
**Duration:** 4-5 weeks

---

**Epic Owner:** Backend Team Lead
**Priority:** High
