import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { Database, profiles, profileProjects } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateProjectDto, UpdateProjectDto } from './dto';

@Injectable()
export class ProjectService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile.id;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const profileId = await this.getProfileId(userId);

    const [project] = await this.db.insert(profileProjects).values({
      profileId,
      title: dto.title,
      description: dto.description,
      startDate: dto.startDate,
      endDate: dto.endDate,
      url: dto.url,
      technologies: dto.technologies,
      highlights: dto.highlights,
      displayOrder: dto.displayOrder || 0,
    }).returning();

    return project;
  }

  async findAll(userId: string) {
    const profileId = await this.getProfileId(userId);

    return this.db.query.profileProjects.findMany({
      where: eq(profileProjects.profileId, profileId),
      orderBy: (p, { asc }) => [asc(p.displayOrder)],
    });
  }

  async findOne(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const project = await this.db.query.profileProjects.findFirst({
      where: and(eq(profileProjects.id, id), eq(profileProjects.profileId, profileId)),
    });

    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.profileProjects.findFirst({
      where: and(eq(profileProjects.id, id), eq(profileProjects.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Project not found');

    await this.db.update(profileProjects)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(profileProjects.id, id));

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.profileProjects.findFirst({
      where: and(eq(profileProjects.id, id), eq(profileProjects.profileId, profileId)),
    });

    if (!existing) throw new NotFoundException('Project not found');

    await this.db.delete(profileProjects).where(eq(profileProjects.id, id));

    return { success: true };
  }
}
