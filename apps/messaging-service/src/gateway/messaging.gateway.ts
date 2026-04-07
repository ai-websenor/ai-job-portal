import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { CustomLogger } from '@ai-job-portal/logger';
import { MessageService } from '../message/message.service';
import { PresenceService } from '../presence/presence.service';
import { getUserProfiles } from '../utils/user.helper';
import { Database } from '@ai-job-portal/database';
import { S3Service } from '@ai-job-portal/aws';
import { DATABASE_CLIENT } from '../database/database.module';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/messaging',
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new CustomLogger();

  constructor(
    private readonly jwtService: JwtService,
    private readonly messageService: MessageService,
    private readonly presenceService: PresenceService,
    @Inject(DATABASE_CLIENT) private readonly db: Database,
    private readonly s3Service: S3Service,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('Connection rejected: no token', 'MessagingGateway', {
          socketId: client.id,
        });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      await this.presenceService.setOnline(payload.sub, client.id);

      client.broadcast.emit('user_online', { userId: payload.sub });

      this.logger.success('Socket connected', 'MessagingGateway', {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        socketId: client.id,
      });
    } catch (error: any) {
      this.logger.error('Connection auth failed', 'MessagingGateway', {
        socketId: client.id,
        error: error.message,
      });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      await this.presenceService.setOffline(client.userId);
      client.broadcast.emit('user_offline', { userId: client.userId });
      this.logger.warn('Socket disconnected', 'MessagingGateway', {
        userId: client.userId,
        socketId: client.id,
      });
    }
  }

  @SubscribeMessage('join_thread')
  async handleJoinThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!client.userId) return;
    client.join(`thread:${data.threadId}`);
    this.logger.success('Thread joined', 'MessagingGateway', {
      userId: client.userId,
      threadId: data.threadId,
      socketId: client.id,
    });
    return { event: 'joined_thread', data: { threadId: data.threadId } };
  }

  @SubscribeMessage('leave_thread')
  async handleLeaveThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!client.userId) return;
    client.leave(`thread:${data.threadId}`);
    return { event: 'left_thread', data: { threadId: data.threadId } };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string; body: string; attachments?: any[] },
  ) {
    if (!client.userId) return;

    try {
      const message = await this.messageService.sendMessage(
        client.userId,
        data.threadId,
        { body: data.body, attachments: data.attachments },
        client.userRole,
      );

      const profileMap = await getUserProfiles(
        this.db,
        [message.senderId, message.recipientId],
        this.s3Service,
      );
      const enrichedMessage = {
        ...message,
        attachments: await this.messageService.signAttachments(message.attachments),
        sender: profileMap.get(message.senderId) || null,
        recipient: profileMap.get(message.recipientId) || null,
      };

      // Emit to the thread room (all participants)
      this.server.to(`thread:${data.threadId}`).emit('new_message', enrichedMessage);

      // Also emit directly to recipient socket if not in room
      const recipientSocketId = await this.presenceService.getSocketId(message.recipientId);
      if (recipientSocketId) {
        this.server.to(recipientSocketId).emit('new_message', enrichedMessage);

        // Auto-mark as delivered since recipient is online
        await this.messageService.markAsDelivered([message.id]);
        const deliveredAt = new Date();
        this.server.to(recipientSocketId).emit('message_delivered', {
          messageId: message.id,
          threadId: data.threadId,
          deliveredAt,
        });
        client.emit('message_delivered', {
          messageId: message.id,
          threadId: data.threadId,
          deliveredAt,
        });
      }

      // Confirm to sender
      client.emit('message_sent', enrichedMessage);

      const hasAttachments = !!message.attachments;
      this.logger.success(
        hasAttachments ? '📎 Message sent with attachment' : '💬 Message sent',
        'MessagingGateway',
        {
          messageId: message.id,
          threadId: data.threadId,
          senderId: client.userId,
          recipientId: message.recipientId,
          recipientOnline: !!recipientSocketId,
          hasAttachments,
        },
      );

      return { event: 'message_sent', data: enrichedMessage };
    } catch (error: any) {
      this.logger.error('Message send failed', 'MessagingGateway', {
        userId: client.userId,
        threadId: data.threadId,
        error: error.message,
      });
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!client.userId) return;
    client.to(`thread:${data.threadId}`).emit('user_typing', {
      userId: client.userId,
      threadId: data.threadId,
    });
  }

  @SubscribeMessage('stop_typing')
  async handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!client.userId) return;
    client.to(`thread:${data.threadId}`).emit('user_stop_typing', {
      userId: client.userId,
      threadId: data.threadId,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageIds: string[]; threadId: string },
  ) {
    if (!client.userId) return;

    try {
      await this.messageService.markAsRead(client.userId, { messageIds: data.messageIds });

      const readAt = new Date();

      // Notify the thread room about read receipts
      client.to(`thread:${data.threadId}`).emit('message_read', {
        messageIds: data.messageIds,
        threadId: data.threadId,
        readBy: client.userId,
        readAt,
      });

      this.logger.success('Messages marked read', 'MessagingGateway', {
        userId: client.userId,
        threadId: data.threadId,
        messageCount: data.messageIds.length,
      });

      return { event: 'message_read', data: { messageIds: data.messageIds, readAt } };
    } catch (error: any) {
      this.logger.error('Mark read failed', 'MessagingGateway', {
        userId: client.userId,
        threadId: data.threadId,
        error: error.message,
      });
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return;
    await this.presenceService.refreshOnline(client.userId);
    return { event: 'heartbeat_ack' };
  }
}
