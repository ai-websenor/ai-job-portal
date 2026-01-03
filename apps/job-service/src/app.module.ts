import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { JobModule } from './job/job.module';
import { CategoryModule } from './category/category.module';
import { SkillModule } from './skill/skill.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    JobModule,
    CategoryModule,
    SkillModule,
    SearchModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
