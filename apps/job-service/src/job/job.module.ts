import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../common/strategies/jwt.strategy';
import { DatabaseModule } from '../database/database.module';
import { ElasticModule } from '../elastic/elastic.module';
import { JobSearchService } from './job-search.service';

@Module({
  imports: [DatabaseModule, PassportModule, ElasticModule],
  controllers: [JobController],
  providers: [JobService, JobSearchService, JwtStrategy],
  exports: [JobService],
})
export class JobModule {}
