import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Public } from '@ai-job-portal/common';
import { ScreeningQuestionService } from './screening-question.service';
import { CreateScreeningQuestionDto, UpdateScreeningQuestionDto, ReorderQuestionsDto } from './dto';

@ApiTags('screening-questions')
@Controller('jobs/:jobId/questions')
export class ScreeningQuestionController {
  constructor(private readonly screeningQuestionService: ScreeningQuestionService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add screening question to job' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 201, description: 'Question added' })
  create(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Body() dto: CreateScreeningQuestionDto,
  ) {
    return this.screeningQuestionService.create(userId, jobId, dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all screening questions for job' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Questions retrieved' })
  findAll(@Param('jobId') jobId: string) {
    return this.screeningQuestionService.findAll(jobId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get screening question by ID' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question retrieved' })
  findOne(@Param('jobId') jobId: string, @Param('id') id: string) {
    return this.screeningQuestionService.findOne(jobId, id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update screening question' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question updated' })
  update(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScreeningQuestionDto,
  ) {
    return this.screeningQuestionService.update(userId, jobId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete screening question' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question deleted' })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Param('id') id: string,
  ) {
    return this.screeningQuestionService.remove(userId, jobId, id);
  }

  @Post('reorder')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Reorder screening questions' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Questions reordered' })
  reorder(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Body() dto: ReorderQuestionsDto,
  ) {
    return this.screeningQuestionService.reorder(userId, jobId, dto);
  }
}
