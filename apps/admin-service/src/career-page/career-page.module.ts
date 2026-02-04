import { Module } from '@nestjs/common';
import { CareerPageController, PublicCareerPageController } from './career-page.controller';
import { CareerPageService } from './career-page.service';

@Module({
  controllers: [CareerPageController, PublicCareerPageController],
  providers: [CareerPageService],
  exports: [CareerPageService],
})
export class CareerPageModule {}
