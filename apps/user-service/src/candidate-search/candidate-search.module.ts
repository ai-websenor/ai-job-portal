import { Module } from '@nestjs/common';
import { CandidateSearchController } from './candidate-search.controller';
import { SavedCandidateController } from './saved-candidate.controller';
import { CandidateProfileController } from './candidate-profile.controller';
import { CandidateSearchService } from './candidate-search.service';
import { CandidateProfileService } from './candidate-profile.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [CandidateSearchController, SavedCandidateController, CandidateProfileController],
  providers: [CandidateSearchService, CandidateProfileService],
  exports: [CandidateSearchService, CandidateProfileService],
})
export class CandidateSearchModule {}
