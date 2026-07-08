import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import {
  ContentController,
  PublicContentController,
  PublicFaqController,
} from './content.controller';

@Module({
  controllers: [ContentController, PublicContentController, PublicFaqController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
