import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@ai-job-portal/common';

const SWAGGER_DESCRIPTION = `
## AI Job Portal — Messaging, Chat & Real-time WebSocket API

All REST endpoints require \`Authorization: Bearer <jwt_token>\` header.
Requests go through the **API Gateway** (port 3000) which proxies to this service (port 3008).

---

## Frontend Integration Guide — Step by Step

### Step 1: Initialize — Connect WebSocket + Load Thread List

\`\`\`
On app load / login:
  1. Connect WebSocket to ws://localhost:3000/messaging (via gateway) or ws://localhost:3008/messaging (direct)
     Pass JWT: { auth: { token: "<jwt>" } }
  2. GET /api/v1/messages/threads?page=1&limit=20       → load inbox
  3. GET /api/v1/messages/unread/count                   → badge count for Messages tab
\`\`\`

### Step 2: Messages Inbox Screen (Thread List)

\`\`\`
Display each thread:
  - participants[].firstName + lastName   → user name (filter out current user)
  - participants[].profilePhoto           → avatar image
  - participants[].isOnline               → "Active Now" badge
  - lastMessage.body                      → message preview (truncate to ~40 chars)
  - lastMessageAt                         → relative time ("12 mins ago", "3:40 PM")
  - unreadCount > 0                       → show blue unread dot
\`\`\`

### Step 3: Open a Conversation (Chat Screen)

\`\`\`
When user taps a thread:
  1. GET /api/v1/messages/threads/:threadId              → thread header (participant name, photo, online)
  2. GET /api/v1/messages/threads/:threadId/messages      → load messages (newest first)
  3. POST /api/v1/messages/threads/:threadId/mark-read    → clear unread badge
  4. WebSocket emit: join_thread { threadId }              → join room for real-time
\`\`\`

### Step 4: Display Messages as Chat Bubbles

\`\`\`
For each message:
  - if senderId === currentUserId → right-aligned (sent by me), purple background
  - else → left-aligned (received), light background
  - Show sender.profilePhoto next to received messages
  - Show createdAt as time (e.g., "9:30")
  - Checkmarks based on status:
      "sent"      → single grey check ✓
      "delivered"  → double grey checks ✓✓
      "read"       → double green checks ✓✓
  - Group by date for separators ("Today", "Yesterday", "Feb 25")
\`\`\`

### Step 5: Send a Message

\`\`\`
Option A — REST API:
  POST /api/v1/messages/threads/:threadId/messages
  Body: { "body": "Hello!", "attachments": [...] }

Option B — WebSocket (recommended for real-time):
  emit: send_message { threadId, body: "Hello!", attachments: [...] }
  listen: message_sent → confirmation with full message object
\`\`\`

### Step 6: Real-time Events (WebSocket Listeners)

\`\`\`
Listen for these server events:

  new_message        → append to chat, update thread list preview
  message_delivered   → update checkmarks to ✓✓ grey
  message_read        → update checkmarks to ✓✓ green
  user_typing         → show "typing..." indicator in chat
  user_stop_typing    → hide typing indicator
  user_online         → update "Active Now" badge
  user_offline        → remove "Active Now" badge
\`\`\`

### Step 7: Search Messages

\`\`\`
GET /api/v1/messages/search?q=interview&page=1&limit=20
  - Debounce input 300ms before calling
  - Results include thread context → tap to navigate to full conversation
\`\`\`

### Step 8: Leave Conversation

\`\`\`
When user navigates away from chat:
  WebSocket emit: leave_thread { threadId }
\`\`\`

---

## WebSocket Reference

**Connection:** \`ws://localhost:3008/messaging\`

**Authentication:** Pass JWT token in the connection handshake:
\`\`\`javascript
const socket = io("ws://localhost:3008/messaging", {
  auth: { token: "eyJhbGciOiJIUzI1NiIs..." }
});
\`\`\`

### Client → Server Events (emit)

| Event | Payload | Description |
|-------|---------|-------------|
| \`join_thread\` | \`{ threadId: string }\` | Join a thread room for real-time updates |
| \`leave_thread\` | \`{ threadId: string }\` | Leave a thread room |
| \`send_message\` | \`{ threadId, body, subject?, attachments? }\` | Send a message (saves + broadcasts) |
| \`typing\` | \`{ threadId: string }\` | Notify the other user you are typing |
| \`stop_typing\` | \`{ threadId: string }\` | Notify the other user you stopped typing |
| \`mark_read\` | \`{ messageIds: string[], threadId: string }\` | Mark messages as read + notify sender |
| \`heartbeat\` | (none) | Keep-alive — send every 60s to stay "online" |

### Server → Client Events (listen)

| Event | Payload | When |
|-------|---------|------|
| \`new_message\` | Full message object with sender/recipient profiles | Someone sends you a message |
| \`message_sent\` | Full message object | Confirmation after your send_message |
| \`message_delivered\` | \`{ messageId, threadId, deliveredAt }\` | Your message was delivered to recipient's socket |
| \`message_read\` | \`{ messageIds[], threadId, readBy, readAt }\` | Your messages were read by recipient |
| \`user_typing\` | \`{ userId, threadId }\` | Someone is typing in your thread |
| \`user_stop_typing\` | \`{ userId, threadId }\` | Someone stopped typing |
| \`user_online\` | \`{ userId }\` | A user connected |
| \`user_offline\` | \`{ userId }\` | A user disconnected |
| \`error\` | \`{ message: string }\` | An error occurred |

---

## Message Status Flow

\`\`\`
sent → delivered → read

- "sent": Message saved to DB (default on creation)
- "delivered": Recipient's socket received the new_message event
- "read": Recipient explicitly marked the message as read
\`\`\`
`;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true });

  // Enable WebSocket support with Socket.io
  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('Messaging Service')
    .setDescription(SWAGGER_DESCRIPTION)
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('threads', 'Create, list, and manage conversation threads between users')
    .addTag('messages', 'Send, read, and manage individual messages within threads')
    .addTag('search', 'Full-text search across messages by keyword')
    .addTag('presence', 'Check online/offline status of users')
    .addTag('chat', 'AI chatbot sessions and messages')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3008;
  await app.listen(port, '0.0.0.0');
  console.log(`Messaging Service running on http://localhost:${port}`);
  console.log(`WebSocket available at ws://localhost:${port}/messaging`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
