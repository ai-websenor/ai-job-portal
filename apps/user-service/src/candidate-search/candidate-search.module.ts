import { Module } from '@nestjs/common';
import { CandidateSearchController } from './candidate-search.controller';
import { SavedCandidateController } from './saved-candidate.controller';
import { CandidateSearchService } from './candidate-search.service';

@Module({
  controllers: [CandidateSearchController, SavedCandidateController],
  providers: [CandidateSearchService],
  exports: [CandidateSearchService],
})
export class CandidateSearchModule {}
