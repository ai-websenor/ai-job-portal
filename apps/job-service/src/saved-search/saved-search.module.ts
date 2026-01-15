import { Module } from '@nestjs/common';
import { SavedSearchController } from './saved-search.controller';
import { SavedSearchService } from './saved-search.service';
import { DatabaseModule } from '../database/database.module';
import { JwtStrategy } from '../common/strategies/jwt.strategy';

@Module({
  imports: [DatabaseModule],
  controllers: [SavedSearchController],
  providers: [SavedSearchService, JwtStrategy],
  exports: [SavedSearchService],
})
export class SavedSearchModule {}
