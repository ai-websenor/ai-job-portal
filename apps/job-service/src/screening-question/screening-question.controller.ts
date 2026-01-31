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
  async create(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Body() dto: CreateScreeningQuestionDto,
  ) {
    const question = await this.screeningQuestionService.create(userId, jobId, dto);
    return { message: 'Screening question created successfully', data: question };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all screening questions for job' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Questions retrieved' })
  async findAll(@Param('jobId') jobId: string) {
    const questions = await this.screeningQuestionService.findAll(jobId);
    return { message: 'Screening questions fetched successfully', data: questions };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get screening question by ID' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question retrieved' })
  async findOne(@Param('jobId') jobId: string, @Param('id') id: string) {
    const question = await this.screeningQuestionService.findOne(jobId, id);
    return { message: 'Screening question fetched successfully', data: question };
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update screening question' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question updated' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScreeningQuestionDto,
  ) {
    const question = await this.screeningQuestionService.update(userId, jobId, id, dto);
    return { message: 'Screening question updated successfully', data: question };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete screening question' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question deleted' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Param('id') id: string,
  ) {
    await this.screeningQuestionService.remove(userId, jobId, id);
    return { message: 'Screening question deleted successfully', data: {} };
  }

  @Post('reorder')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Reorder screening questions' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Questions reordered' })
  async reorder(
    @CurrentUser('sub') userId: string,
    @Param('jobId') jobId: string,
    @Body() dto: ReorderQuestionsDto,
  ) {
    const questions = await this.screeningQuestionService.reorder(userId, jobId, dto);
    return { message: 'Screening questions reordered successfully', data: questions };
  }
}
