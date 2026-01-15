import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { ElasticsearchService } from './elastic.service';
import { BulkIndexController } from './bulk-index.controller';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [BulkIndexController],
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
})
export class ElasticModule {}
