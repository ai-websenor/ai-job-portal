import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController, PublicContentController } from './content.controller';

@Module({
  controllers: [ContentController, PublicContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
