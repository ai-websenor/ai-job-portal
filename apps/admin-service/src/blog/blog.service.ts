import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, desc, and, sql, arrayContains } from 'drizzle-orm';
import { Database, blogPosts } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateBlogPostDto, UpdateBlogPostDto, BlogQueryDto } from './dto';

@Injectable()
export class BlogService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async create(authorId: string, dto: CreateBlogPostDto) {
    const existing = await this.db.query.blogPosts.findFirst({
      where: eq(blogPosts.slug, dto.slug),
    });

    if (existing) {
      throw new ConflictException('Blog post with this slug already exists');
    }

    const [post] = await this.db.insert(blogPosts).values({
      title: dto.title,
      slug: dto.slug,
      excerpt: dto.excerpt,
      content: dto.content,
      featuredImage: dto.featuredImage,
      category: dto.category,
      tags: dto.tags,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      authorId,
      status: dto.status || 'draft',
      publishedAt: dto.status === 'published' ? new Date() : null,
    }).returning();

    return post;
  }

  async findAll(query: BlogQueryDto, adminView = false) {
    const conditions = [];

    // Non-admin can only see published posts
    if (!adminView) {
      conditions.push(eq(blogPosts.status, 'published'));
    } else if (query.status) {
      conditions.push(eq(blogPosts.status, query.status));
    }

    if (query.category) {
      conditions.push(eq(blogPosts.category, query.category));
    }

    return this.db.query.blogPosts.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(blogPosts.publishedAt), desc(blogPosts.createdAt)],
    });
  }

  async findOne(idOrSlug: string, adminView = false) {
    // Try to find by ID first, then by slug
    let post = await this.db.query.blogPosts.findFirst({
      where: eq(blogPosts.id, idOrSlug),
    });

    if (!post) {
      post = await this.db.query.blogPosts.findFirst({
        where: eq(blogPosts.slug, idOrSlug),
      });
    }

    if (!post) throw new NotFoundException('Blog post not found');

    // Non-admin can only view published posts
    if (!adminView && post.status !== 'published') {
      throw new NotFoundException('Blog post not found');
    }

    // Increment view count for published posts
    if (post.status === 'published') {
      await this.db.update(blogPosts)
        .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
        .where(eq(blogPosts.id, post.id));
    }

    return post;
  }

  async update(postId: string, dto: UpdateBlogPostDto) {
    if (dto.slug) {
      const existing = await this.db.query.blogPosts.findFirst({
        where: and(
          eq(blogPosts.slug, dto.slug),
          sql`${blogPosts.id} != ${postId}`,
        ),
      });

      if (existing) {
        throw new ConflictException('Blog post with this slug already exists');
      }
    }

    const updateData: any = { ...dto, updatedAt: new Date() };

    // Set publishedAt when first publishing
    if (dto.status === 'published') {
      const current = await this.db.query.blogPosts.findFirst({
        where: eq(blogPosts.id, postId),
      });
      if (current && current.status !== 'published' && !current.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const [updated] = await this.db.update(blogPosts)
      .set(updateData)
      .where(eq(blogPosts.id, postId))
      .returning();

    if (!updated) throw new NotFoundException('Blog post not found');

    return updated;
  }

  async remove(postId: string) {
    const post = await this.db.query.blogPosts.findFirst({
      where: eq(blogPosts.id, postId),
    });

    if (!post) throw new NotFoundException('Blog post not found');

    await this.db.delete(blogPosts).where(eq(blogPosts.id, postId));

    return { success: true, message: 'Blog post deleted' };
  }

  async getCategories() {
    const result = await this.db
      .selectDistinct({ category: blogPosts.category })
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'));

    return result.map(r => r.category).filter(Boolean);
  }
}
