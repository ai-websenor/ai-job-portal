import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { Database, profiles, skills, profileSkills } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { AddProfileSkillDto, UpdateProfileSkillDto, SkillQueryDto } from './dto';

@Injectable()
export class SkillService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile.id;
  }

  // Master skills list
  async getAllSkills(query: SkillQueryDto) {
    let whereClause = eq(skills.isActive, true);

    if (query.category) {
      whereClause = and(whereClause, eq(skills.category, query.category as any))!;
    }

    if (query.search) {
      whereClause = and(whereClause, ilike(skills.name, `%${query.search}%`))!;
    }

    return this.db.query.skills.findMany({
      where: whereClause,
      orderBy: (s, { asc }) => [asc(s.name)],
    });
  }

  // Profile skills
  async addSkill(userId: string, dto: AddProfileSkillDto) {
    const profileId = await this.getProfileId(userId);

    // Check if skill exists
    const skill = await this.db.query.skills.findFirst({
      where: eq(skills.id, dto.skillId),
    });
    if (!skill) throw new NotFoundException('Skill not found');

    // Check if already added
    const existing = await this.db.query.profileSkills.findFirst({
      where: and(
        eq(profileSkills.profileId, profileId),
        eq(profileSkills.skillId, dto.skillId),
      ),
    });
    if (existing) throw new ConflictException('Skill already added to profile');

    const [profileSkill] = await this.db.insert(profileSkills).values({
      profileId,
      skillId: dto.skillId,
      proficiencyLevel: dto.proficiencyLevel,
      yearsOfExperience: dto.yearsOfExperience?.toString(),
      displayOrder: dto.displayOrder || 0,
    }).returning();

    return { ...profileSkill, skill };
  }

  async getProfileSkills(userId: string) {
    const profileId = await this.getProfileId(userId);

    const result = await this.db.query.profileSkills.findMany({
      where: eq(profileSkills.profileId, profileId),
      orderBy: (ps, { asc }) => [asc(ps.displayOrder)],
      with: {
        skill: true,
      },
    });

    return result;
  }

  async updateProfileSkill(userId: string, skillId: string, dto: UpdateProfileSkillDto) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.profileSkills.findFirst({
      where: and(
        eq(profileSkills.profileId, profileId),
        eq(profileSkills.skillId, skillId),
      ),
    });

    if (!existing) throw new NotFoundException('Skill not found in profile');

    const updateData: Record<string, any> = {};
    if (dto.proficiencyLevel) updateData.proficiencyLevel = dto.proficiencyLevel;
    if (dto.yearsOfExperience !== undefined) updateData.yearsOfExperience = dto.yearsOfExperience.toString();
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;

    await this.db.update(profileSkills)
      .set(updateData)
      .where(eq(profileSkills.id, existing.id));

    return this.db.query.profileSkills.findFirst({
      where: eq(profileSkills.id, existing.id),
      with: { skill: true },
    });
  }

  async removeSkill(userId: string, skillId: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.profileSkills.findFirst({
      where: and(
        eq(profileSkills.profileId, profileId),
        eq(profileSkills.skillId, skillId),
      ),
    });

    if (!existing) throw new NotFoundException('Skill not found in profile');

    await this.db.delete(profileSkills).where(eq(profileSkills.id, existing.id));

    return { success: true };
  }
}
