import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { Database, chatSessions, chatMessages } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import {
  CreateChatSessionDto,
  SendChatMessageDto,
  ChatQueryDto,
  EndSessionDto,
  EscalateDto,
} from './dto';

@Injectable()
export class ChatService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async createSession(userId: string, dto: CreateChatSessionDto) {
    const [session] = await this.db
      .insert(chatSessions)
      .values({
        userId,
        messagesCount: 0,
      })
      .returning();

    // If initial message provided, add it
    if (dto.initialMessage) {
      await this.addMessage(session.id, userId, {
        message: dto.initialMessage,
      });

      // Add bot response (placeholder - would integrate with AI)
      await this.addBotMessage(session.id, 'Hello! How can I help you today?');
    }

    return session;
  }

  async getSessions(userId: string, query: ChatQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const sessions = await this.db.query.chatSessions.findMany({
      where: and(
        eq(chatSessions.userId, userId),
        query.activeOnly ? isNull(chatSessions.endedAt) : sql`true`,
      ),
      orderBy: [desc(chatSessions.startedAt)],
      limit,
      offset,
    });

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId));

    const total = Number(totalResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      data: sessions,
      pagination: {
        totalSession: total,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.db.query.chatSessions.findFirst({
      where: and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)),
    });

    if (!session) throw new NotFoundException('Chat session not found');
    return session;
  }

  async getSessionMessages(userId: string, sessionId: string, page = 1, limit = 50) {
    await this.getSession(userId, sessionId); // Verify access

    const offset = (page - 1) * limit;

    const msgs = await this.db.query.chatMessages.findMany({
      where: eq(chatMessages.sessionId, sessionId),
      orderBy: [desc(chatMessages.timestamp)],
      limit,
      offset,
    });

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId));

    const total = Number(totalResult[0]?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      data: msgs.reverse(), // Return in chronological order
      pagination: {
        totalChatMessage: total,
        pageCount,
        currentPage: page,
        hasNextPage: page < pageCount,
      },
    };
  }

  async addMessage(sessionId: string, userId: string, dto: SendChatMessageDto) {
    const session = await this.db.query.chatSessions.findFirst({
      where: eq(chatSessions.id, sessionId),
    });

    if (!session) throw new NotFoundException('Chat session not found');
    if (session.userId !== userId) throw new NotFoundException('Chat session not found');
    if (session.endedAt) throw new BadRequestException('Session has ended');

    const [message] = await this.db
      .insert(chatMessages)
      .values({
        sessionId,
        sender: 'user',
        message: dto.message,
      })
      .returning();

    // Increment message count
    await this.db
      .update(chatSessions)
      .set({ messagesCount: sql`${chatSessions.messagesCount} + 1` })
      .where(eq(chatSessions.id, sessionId));

    // Generate bot response (placeholder - would integrate with AI service)
    const botResponse = await this.generateBotResponse(dto.message);
    await this.addBotMessage(
      sessionId,
      botResponse.message,
      botResponse.intent,
      botResponse.confidence,
    );

    return message;
  }

  private async addBotMessage(
    sessionId: string,
    message: string,
    intent?: string,
    confidence?: number,
  ) {
    const [botMessage] = await this.db
      .insert(chatMessages)
      .values({
        sessionId,
        sender: 'bot',
        message,
        intent,
        confidence: confidence?.toString(),
      })
      .returning();

    await this.db
      .update(chatSessions)
      .set({ messagesCount: sql`${chatSessions.messagesCount} + 1` })
      .where(eq(chatSessions.id, sessionId));

    return botMessage;
  }

  private async generateBotResponse(userMessage: string) {
    // Placeholder - would integrate with AI/NLP service
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('job') || lowerMessage.includes('career')) {
      return {
        message: 'I can help you find jobs! What type of role are you looking for?',
        intent: 'job_search',
        confidence: 0.85,
      };
    }
    if (lowerMessage.includes('resume') || lowerMessage.includes('cv')) {
      return {
        message:
          'I can help with your resume. Would you like tips on improving it or help uploading?',
        intent: 'resume_help',
        confidence: 0.9,
      };
    }
    if (lowerMessage.includes('interview')) {
      return {
        message:
          'Preparing for an interview? I can share tips or help you practice common questions.',
        intent: 'interview_prep',
        confidence: 0.88,
      };
    }
    if (lowerMessage.includes('apply') || lowerMessage.includes('application')) {
      return {
        message:
          'I can guide you through the application process. Which job are you interested in?',
        intent: 'application_help',
        confidence: 0.82,
      };
    }

    return {
      message:
        "I'm here to help with your job search. You can ask about jobs, resumes, interviews, or applications.",
      intent: 'general',
      confidence: 0.5,
    };
  }

  async endSession(userId: string, sessionId: string, dto: EndSessionDto) {
    const session = await this.getSession(userId, sessionId);
    if (session.endedAt) throw new BadRequestException('Session already ended');

    await this.db
      .update(chatSessions)
      .set({
        endedAt: new Date(),
        satisfactionRating: dto.satisfactionRating,
      })
      .where(eq(chatSessions.id, sessionId));

    return this.getSession(userId, sessionId);
  }

  async escalateToHuman(userId: string, sessionId: string, dto: EscalateDto) {
    const session = await this.getSession(userId, sessionId);
    if (session.endedAt) throw new BadRequestException('Session already ended');

    await this.db
      .update(chatSessions)
      .set({ escalatedToHuman: true })
      .where(eq(chatSessions.id, sessionId));

    // Add system message about escalation
    await this.db.insert(chatMessages).values({
      sessionId,
      sender: 'bot',
      message: `Escalating to human support. Reason: ${dto.reason}. A support agent will be with you shortly.`,
      intent: 'escalation',
    });

    return { success: true, message: 'Escalated to human support' };
  }
}
