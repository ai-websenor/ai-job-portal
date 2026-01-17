import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { ThreadService } from './thread.service';
import { CreateThreadDto, ThreadQueryDto, UpdateThreadDto, ThreadResponseDto } from './dto';

@ApiTags('threads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('messages/threads')
export class ThreadController {
  constructor(private readonly threadService: ThreadService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new message thread or send message to existing' })
  @ApiResponse({ status: 201, description: 'Thread created with initial message' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateThreadDto) {
    return this.threadService.createThread(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all message threads for current user' })
  @ApiResponse({ status: 200, description: 'List of threads with pagination' })
  findAll(@CurrentUser('sub') userId: string, @Query() query: ThreadQueryDto) {
    return this.threadService.getThreads(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific thread' })
  @ApiParam({ name: 'id', description: 'Thread ID' })
  @ApiResponse({ status: 200, description: 'Thread details' })
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.threadService.getThread(userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update thread (archive/unarchive)' })
  @ApiParam({ name: 'id', description: 'Thread ID' })
  @ApiResponse({ status: 200, description: 'Thread updated' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateThreadDto,
  ) {
    return this.threadService.updateThread(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive/delete a thread' })
  @ApiParam({ name: 'id', description: 'Thread ID' })
  @ApiResponse({ status: 200, description: 'Thread archived' })
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.threadService.deleteThread(userId, id);
  }
}
