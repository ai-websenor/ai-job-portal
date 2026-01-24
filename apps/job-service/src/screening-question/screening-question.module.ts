import { Module } from '@nestjs/common';
import { ScreeningQuestionController } from './screening-question.controller';
import { ScreeningQuestionService } from './screening-question.service';

@Module({
  controllers: [ScreeningQuestionController],
  providers: [ScreeningQuestionService],
  exports: [ScreeningQuestionService],
})
export class ScreeningQuestionModule {}
