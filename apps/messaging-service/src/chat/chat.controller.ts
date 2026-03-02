import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { ChatService } from './chat.service';
import {
  CreateChatSessionDto,
  SendChatMessageDto,
  ChatQueryDto,
  EndSessionDto,
  EscalateDto,
} from './dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Start a new chat session' })
  @ApiResponse({ status: 201, description: 'Chat session created' })
  async createSession(@CurrentUser('sub') userId: string, @Body() dto: CreateChatSessionDto) {
    const session = await this.chatService.createSession(userId, dto);
    return { message: 'Chat session created successfully', data: session };
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get user chat sessions' })
  @ApiResponse({ status: 200, description: 'List of chat sessions' })
  async getSessions(@CurrentUser('sub') userId: string, @Query() query: ChatQueryDto) {
    const result = await this.chatService.getSessions(userId, query);
    return { message: 'Chat sessions fetched successfully', ...result };
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a specific chat session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Chat session details' })
  async getSession(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    const session = await this.chatService.getSession(userId, id);
    return { message: 'Chat session fetched successfully', data: session };
  }

  @Get('sessions/:id/messages')
  @ApiOperation({ summary: 'Get messages in a chat session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of chat messages' })
  async getSessionMessages(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.chatService.getSessionMessages(userId, id, page || 1, limit || 50);
    return { message: 'Chat messages fetched successfully', ...result };
  }

  @Post('sessions/:id/messages')
  @ApiOperation({ summary: 'Send a message in chat session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 201, description: 'Message sent, bot response returned' })
  async sendMessage(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: SendChatMessageDto,
  ) {
    const chatMessage = await this.chatService.addMessage(id, userId, dto);
    return { message: 'Chat message sent successfully', data: chatMessage };
  }

  @Post('sessions/:id/end')
  @ApiOperation({ summary: 'End a chat session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  async endSession(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: EndSessionDto,
  ) {
    const session = await this.chatService.endSession(userId, id, dto);
    return { message: 'Chat session ended successfully', data: session };
  }

  @Post('sessions/:id/escalate')
  @ApiOperation({ summary: 'Escalate chat to human support' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Escalated to human' })
  async escalate(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: EscalateDto,
  ) {
    await this.chatService.escalateToHuman(userId, id, dto);
    return { message: 'Escalated to human support', data: {} };
  }
}
