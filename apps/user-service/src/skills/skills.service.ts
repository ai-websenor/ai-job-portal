import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateProfileSkillDto } from './dto/create-profile-skill.dto';
import { UpdateProfileSkillDto } from './dto/update-profile-skill.dto';
import { skills, profileSkills } from '@ai-job-portal/database';
import { eq, and, ilike } from 'drizzle-orm';
import { CustomLogger } from '@ai-job-portal/logger';

@Injectable()
export class SkillsService {
  private readonly logger = new CustomLogger();

  constructor(private databaseService: DatabaseService) {}

  /**
   * Add a skill to user's profile
   */
  async addSkillToProfile(profileId: string, createDto: CreateProfileSkillDto) {
    const db = this.databaseService.db;

    // Find or create skill in master skills table
    let skill = await db.query.skills.findFirst({
      where: ilike(skills.name, createDto.skillName),
    });

    if (!skill) {
      [skill] = await db
        .insert(skills)
        .values({
          name: createDto.skillName,
          category: createDto.category || 'technical',
          isActive: true,
        })
        .returning();

      this.logger.success(`New skill created>>>>: ${createDto.skillName}`, 'SkillsService');
    }

    // Add skill to profile
    const [profileSkill] = await db
      .insert(profileSkills)
      .values({
        profileId,
        skillId: skill.id,
        proficiencyLevel: createDto.proficiencyLevel,
        yearsOfExperience: createDto.yearsOfExperience?.toString(),
      })
      .returning();

    this.logger.success(`Skill ${skill.name} added to profile ${profileId}`, 'SkillsService');

    return {
      ...profileSkill,
      skill: {
        id: skill.id,
        name: skill.name,
        category: skill.category,
      },
    };
  }

  /**
   * Get all skills for a profile
   */
  async findAllByProfile(profileId: string) {
    const db = this.databaseService.db;

    const userSkills = await db.query.profileSkills.findMany({
      where: eq(profileSkills.profileId, profileId),
      with: {
        skill: true,
      },
      orderBy: (profileSkills, { desc }) => [desc(profileSkills.createdAt)],
    });

    return userSkills.map((ps) => ({
      id: ps.id,
      proficiencyLevel: ps.proficiencyLevel,
      yearsOfExperience: ps.yearsOfExperience,
      displayOrder: ps.displayOrder,
      createdAt: ps.createdAt,
      skill: ps.skill,
    }));
  }

  /**
   * Get a specific profile skill
   */
  async findOne(id: string, profileId: string) {
    const db = this.databaseService.db;

    const profileSkill = await db.query.profileSkills.findFirst({
      where: and(eq(profileSkills.id, id), eq(profileSkills.profileId, profileId)),
      with: {
        skill: true,
      },
    });

    if (!profileSkill) {
      throw new NotFoundException('Skill not found in profile');
    }

    return {
      id: profileSkill.id,
      proficiencyLevel: profileSkill.proficiencyLevel,
      yearsOfExperience: profileSkill.yearsOfExperience,
      displayOrder: profileSkill.displayOrder,
      createdAt: profileSkill.createdAt,
      skill: profileSkill.skill,
    };
  }

  /**
   * Update a profile skill
   */
  async update(id: string, profileId: string, updateDto: UpdateProfileSkillDto) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId); // Check if exists

    const updateData: any = {
      proficiencyLevel: updateDto.proficiencyLevel,
      yearsOfExperience: updateDto.yearsOfExperience?.toString(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const [updated] = await db
      .update(profileSkills)
      .set(updateData)
      .where(and(eq(profileSkills.id, id), eq(profileSkills.profileId, profileId)))
      .returning();
    this.logger.success(`Profile skill ${updated} updated`);
    this.logger.info(`Profile skill ${id} updated`, 'SkillsService');

    // Fetch with skill details
    return this.findOne(id, profileId);
  }

  /**
   * Remove a skill from profile
   */
  async remove(id: string, profileId: string) {
    const db = this.databaseService.db;

    await this.findOne(id, profileId); // Check if exists

    await db
      .delete(profileSkills)
      .where(and(eq(profileSkills.id, id), eq(profileSkills.profileId, profileId)));

    this.logger.success(`Skill ${id} removed from profile ${profileId}`, 'SkillsService');
    return { message: 'Skill removed from profile successfully' };
  }

  /**
   * Get skill suggestions based on partial name
   */
  async getSkillSuggestions(query: string, limit: number = 10) {
    const db = this.databaseService.db;

    const suggestions = await db.query.skills.findMany({
      where: and(ilike(skills.name, `%${query}%`), eq(skills.isActive, true)),
      limit,
    });

    return suggestions;
  }

  /**
   * Get all available skills
   */
  async getAllSkills(category?: string) {
    const db = this.databaseService.db;

    const where = category
      ? and(eq(skills.category, category as any), eq(skills.isActive, true))
      : eq(skills.isActive, true);

    const allSkills = await db.query.skills.findMany({
      where,
      orderBy: (skills, { asc }) => [asc(skills.name)],
    });

    return allSkills;
  }
}
