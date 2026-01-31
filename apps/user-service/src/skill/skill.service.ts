import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike } from 'drizzle-orm';
import { Database, profiles, skills, profileSkills } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import {
  AddProfileSkillDto,
  BulkAddProfileSkillDto,
  UpdateProfileSkillDto,
  SkillQueryDto,
  ProficiencyLevel,
} from './dto';
import { updateOnboardingStep, recalculateOnboardingCompletion } from '../utils/onboarding.helper';

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

  // Helper to add a single skill to profile
  private async addSkillToProfile(profileId: string, dto: AddProfileSkillDto) {
    // Find skill by name (case-insensitive) in master list
    let skill = await this.db.query.skills.findFirst({
      where: ilike(skills.name, dto.skillName),
    });

    // If skill not found in master list, create it as a custom skill
    if (!skill) {
      const [newSkill] = await this.db
        .insert(skills)
        .values({
          name: dto.skillName.trim(),
          category: dto.category || 'industry_specific',
          isActive: true,
          isCustom: true,
        })
        .returning();
      skill = newSkill;
    }

    // Check if already added
    const existing = await this.db.query.profileSkills.findFirst({
      where: and(eq(profileSkills.profileId, profileId), eq(profileSkills.skillId, skill.id)),
    });

    if (existing) {
      // If it exists, we might want to return the existing one or throw conflict
      // For bulk add, sticking to throw for consistency, but caller can catch
      throw new ConflictException(`Skill '${dto.skillName}' already added to profile`);
    }

    const [profileSkill] = await this.db
      .insert(profileSkills)
      .values({
        profileId,
        skillId: skill.id,
        proficiencyLevel: dto.proficiencyLevel || ProficiencyLevel.BEGINNER,
        yearsOfExperience: dto.yearsOfExperience?.toString(),
        displayOrder: dto.displayOrder || 0,
      })
      .returning();

    return { ...profileSkill, skill };
  }

  // Profile skills
  async addSkill(userId: string, dto: AddProfileSkillDto) {
    const profileId = await this.getProfileId(userId);

    const result = await this.addSkillToProfile(profileId, dto);

    await updateOnboardingStep(this.db, userId, 4);

    return { message: 'Skill added successfully', data: result };
  }

  async addSkillsBulk(userId: string, dto: BulkAddProfileSkillDto) {
    const profileId = await this.getProfileId(userId);
    const results = [];
    const errors = [];

    for (const skillDto of dto.skills) {
      try {
        const result = await this.addSkillToProfile(profileId, skillDto);
        results.push(result);
      } catch (error) {
        if (error instanceof ConflictException) {
          // If already exists, we can consider it "success" or just skip
          // For now, let's just log/ignore duplicates in bulk op
          continue;
        }
        errors.push({ skill: skillDto.skillName, error: error.message });
      }
    }

    await updateOnboardingStep(this.db, userId, 4);

    return { message: 'Skills added successfully', data: { added: results, errors } };
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
      where: and(eq(profileSkills.profileId, profileId), eq(profileSkills.skillId, skillId)),
    });

    if (!existing) throw new NotFoundException('Skill not found in profile');

    const updateData: Record<string, any> = {};
    if (dto.proficiencyLevel) updateData.proficiencyLevel = dto.proficiencyLevel;
    if (dto.yearsOfExperience !== undefined)
      updateData.yearsOfExperience = dto.yearsOfExperience.toString();
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;

    await this.db.update(profileSkills).set(updateData).where(eq(profileSkills.id, existing.id));

    const result = await this.db.query.profileSkills.findFirst({
      where: eq(profileSkills.id, existing.id),
      with: {
        skill: true,
      },
    });

    await updateOnboardingStep(this.db, userId, 4);

    return { message: 'Skill updated successfully', data: result };
  }

  async removeSkill(userId: string, skillId: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.profileSkills.findFirst({
      where: and(eq(profileSkills.profileId, profileId), eq(profileSkills.skillId, skillId)),
    });

    if (!existing) throw new NotFoundException('Skill not found in profile');

    await this.db.delete(profileSkills).where(eq(profileSkills.id, existing.id));

    await recalculateOnboardingCompletion(this.db, userId);

    return { message: 'Skill removed successfully' };
  }
}
