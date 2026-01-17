import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { ChatService } from './chat.service';
import { CreateChatSessionDto, SendChatMessageDto, ChatQueryDto, EndSessionDto, EscalateDto } from './dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Start a new chat session' })
  @ApiResponse({ status: 201, description: 'Chat session created' })
  createSession(@CurrentUser('sub') userId: string, @Body() dto: CreateChatSessionDto) {
    return this.chatService.createSession(userId, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get user chat sessions' })
  @ApiResponse({ status: 200, description: 'List of chat sessions' })
  getSessions(@CurrentUser('sub') userId: string, @Query() query: ChatQueryDto) {
    return this.chatService.getSessions(userId, query);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a specific chat session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Chat session details' })
  getSession(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.chatService.getSession(userId, id);
  }

  @Get('sessions/:id/messages')
  @ApiOperation({ summary: 'Get messages in a chat session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of chat messages' })
  getSessionMessages(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getSessionMessages(userId, id, page || 1, limit || 50);
  }

  @Post('sessions/:id/messages')
  @ApiOperation({ summary: 'Send a message in chat session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 201, description: 'Message sent, bot response returned' })
  sendMessage(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chatService.addMessage(id, userId, dto);
  }

  @Post('sessions/:id/end')
  @ApiOperation({ summary: 'End a chat session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  endSession(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: EndSessionDto,
  ) {
    return this.chatService.endSession(userId, id, dto);
  }

  @Post('sessions/:id/escalate')
  @ApiOperation({ summary: 'Escalate chat to human support' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Escalated to human' })
  escalate(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: EscalateDto,
  ) {
    return this.chatService.escalateToHuman(userId, id, dto);
  }
}
