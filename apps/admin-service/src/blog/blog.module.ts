import { Module } from '@nestjs/common';
import { AdminBlogController, PublicBlogController } from './blog.controller';
import { BlogService } from './blog.service';

@Module({
  controllers: [AdminBlogController, PublicBlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
