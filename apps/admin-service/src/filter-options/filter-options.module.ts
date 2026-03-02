import { Module } from '@nestjs/common';
import { FilterOptionsController } from './filter-options.controller';
import { FilterOptionsService } from './filter-options.service';

@Module({
  controllers: [FilterOptionsController],
  providers: [FilterOptionsService],
  exports: [FilterOptionsService],
})
export class FilterOptionsModule {}
