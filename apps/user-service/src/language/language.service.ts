import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike } from 'drizzle-orm';
import { Database, profiles, languages, profileLanguages } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { AddProfileLanguageDto, UpdateProfileLanguageDto, LanguageQueryDto } from './dto';

@Injectable()
export class LanguageService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getProfileId(userId: string): Promise<string> {
    const profile = await this.db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
    });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile.id;
  }

  // Master languages list
  async getAllLanguages(query: LanguageQueryDto) {
    let whereClause = eq(languages.isActive, true);

    if (query.search) {
      whereClause = and(whereClause, ilike(languages.name, `%${query.search}%`))!;
    }

    return this.db.query.languages.findMany({
      where: whereClause,
      orderBy: (l, { asc }) => [asc(l.name)],
    });
  }

  // Profile languages
  async addLanguage(userId: string, dto: AddProfileLanguageDto) {
    const profileId = await this.getProfileId(userId);

    // Check if language exists
    const language = await this.db.query.languages.findFirst({
      where: eq(languages.id, dto.languageId),
    });
    if (!language) throw new NotFoundException('Language not found');

    // Check if already added
    const existing = await this.db.query.profileLanguages.findFirst({
      where: and(
        eq(profileLanguages.profileId, profileId),
        eq(profileLanguages.languageId, dto.languageId),
      ),
    });
    if (existing) throw new ConflictException('Language already added to profile');

    const [profileLang] = await this.db.insert(profileLanguages).values({
      profileId,
      languageId: dto.languageId,
      proficiency: dto.proficiency,
      isNative: dto.isNative ?? false,
      canRead: dto.canRead ?? true,
      canWrite: dto.canWrite ?? true,
      canSpeak: dto.canSpeak ?? true,
    }).returning();

    return { ...profileLang, language };
  }

  async getProfileLanguages(userId: string) {
    const profileId = await this.getProfileId(userId);

    return this.db.query.profileLanguages.findMany({
      where: eq(profileLanguages.profileId, profileId),
      with: {
        language: true,
      },
    });
  }

  async updateProfileLanguage(userId: string, languageId: string, dto: UpdateProfileLanguageDto) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.profileLanguages.findFirst({
      where: and(
        eq(profileLanguages.profileId, profileId),
        eq(profileLanguages.languageId, languageId),
      ),
    });

    if (!existing) throw new NotFoundException('Language not found in profile');

    await this.db.update(profileLanguages)
      .set(dto)
      .where(eq(profileLanguages.id, existing.id));

    return this.db.query.profileLanguages.findFirst({
      where: eq(profileLanguages.id, existing.id),
      with: { language: true },
    });
  }

  async removeLanguage(userId: string, languageId: string) {
    const profileId = await this.getProfileId(userId);

    const existing = await this.db.query.profileLanguages.findFirst({
      where: and(
        eq(profileLanguages.profileId, profileId),
        eq(profileLanguages.languageId, languageId),
      ),
    });

    if (!existing) throw new NotFoundException('Language not found in profile');

    await this.db.delete(profileLanguages).where(eq(profileLanguages.id, existing.id));

    return { success: true };
  }
}
