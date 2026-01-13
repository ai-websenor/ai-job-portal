import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { JobModule } from './job/job.module';
import { CategoryModule } from './category/category.module';
import { SkillModule } from './skill/skill.module';
import { SearchModule } from './search/search.module';
import { ElasticModule } from './elastic/elastic.module';
import { SavedSearchModule } from './saved-search/saved-search.module';
import { CompanyModule } from './company/company.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    ElasticModule,
    JobModule,
    CategoryModule,
    SkillModule,
    SearchModule,
    SavedSearchModule,
    CompanyModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
