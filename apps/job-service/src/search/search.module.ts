import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchConditionBuilder } from './search-condition.builder';
import { SearchEnrichmentHelper } from './search-enrichment.helper';
import { JobDiscoveryService } from './job-discovery.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchConditionBuilder, SearchEnrichmentHelper, JobDiscoveryService],
  exports: [SearchService],
})
export class SearchModule {}
