/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, desc } from 'drizzle-orm';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';
import { createHash } from 'crypto';

@Injectable()
export class SavedSearchService {
  // TODO: Add soft limit per user (max 20 saved searches) to prevent abuse
  private readonly MAX_SAVED_SEARCHES_PER_USER = 20;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /**
   * Normalize search criteria before hashing to avoid false duplicates
   *
   * Example problem:
   * { "keyword": "dev", "city": "Bangalore" }
   * vs
   * { "city": "Bangalore", "keyword": "dev" }
   *
   * These are logically the same but JSON order differs.
   *
   * Solution:
   * - Sort keys recursively
   * - Lowercase strings where applicable
   * - Remove undefined/null values
   */
  private normalizeCriteria(criteria: Record<string, any>): string {
    const normalize = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return null;
      }

      if (Array.isArray(obj)) {
        return obj
          .map(normalize)
          .filter((v) => v !== null)
          .sort();
      }

      if (typeof obj === 'object') {
        const sorted: Record<string, any> = {};
        Object.keys(obj)
          .sort()
          .forEach((key) => {
            const value = normalize(obj[key]);
            if (value !== null) {
              sorted[key] = value;
            }
          });
        return sorted;
      }

      if (typeof obj === 'string') {
        return obj.toLowerCase().trim();
      }

      return obj;
    };

    const normalized = normalize(criteria);
    return JSON.stringify(normalized);
  }

  /**
   * Generate SHA-256 hash of normalized search criteria
   *
   * NOTE: In the future, consider adding a `criteria_hash` column to the database
   * for faster duplicate checks and cleaner logic. For now, we compute at runtime.
   */
  private generateCriteriaHash(criteria: Record<string, any>): string {
    const normalized = this.normalizeCriteria(criteria);
    return createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Create a new saved search or return existing if duplicate found
   *
   * UI Behavior Note:
   * "Save Search" dialog should appear only once per unique search,
   * not every time the user performs the same search.
   */
  async create(dto: CreateSavedSearchDto, user: any) {
    const userId = user.id;

    // Validate that searchCriteria is not an empty object
    if (Object.keys(dto.searchCriteria).length === 0) {
      throw new ConflictException('Search criteria cannot be empty');
    }

    // Check user's current saved search count (soft limit)
    const [countResult] = await this.db
      .select({ count: schema.savedSearches.id })
      .from(schema.savedSearches)
      .where(
        and(
          eq(schema.savedSearches.userId, userId),
          eq(schema.savedSearches.isActive, true),
        ),
      );

    // TODO: Uncomment when ready to enforce limit
    // if (countResult && countResult.count >= this.MAX_SAVED_SEARCHES_PER_USER) {
    //   throw new ConflictException(
    //     `Maximum ${this.MAX_SAVED_SEARCHES_PER_USER} saved searches allowed per user`,
    //   );
    // }

    // Generate hash for duplicate detection
    const criteriaHash = this.generateCriteriaHash(dto.searchCriteria);

    // Check for existing saved search with same criteria
    // NOTE: This would be much faster with a criteria_hash column + index
    const existingSearches = await this.db
      .select()
      .from(schema.savedSearches)
      .where(
        and(
          eq(schema.savedSearches.userId, userId),
          eq(schema.savedSearches.isActive, true),
        ),
      );

    // Find duplicate by comparing hashes
    for (const existing of existingSearches) {
      try {
        const existingCriteria = JSON.parse(existing.searchCriteria);
        const existingHash = this.generateCriteriaHash(existingCriteria);

        if (existingHash === criteriaHash) {
          // Return existing record instead of creating duplicate
          return {
            message: 'Search already saved',
            ...existing,
            searchCriteria: existingCriteria, // Return as object, not string
            alertChannels: existing.alertChannels
              ? JSON.parse(existing.alertChannels)
              : [],
          };
        }
      } catch {
        // Skip invalid JSON entries
        continue;
      }
    }

    // Auto-generate name if not provided
    const searchName =
      dto.name ||
      `Search ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    // Create new saved search
    const [savedSearch] = await this.db
      .insert(schema.savedSearches)
      .values({
        userId,
        name: searchName,
        searchCriteria: JSON.stringify(dto.searchCriteria),
        alertEnabled: dto.alertEnabled ?? false,
        alertFrequency: dto.alertFrequency ?? 'weekly',
        alertChannels: dto.alertChannels
          ? JSON.stringify(dto.alertChannels)
          : JSON.stringify(['email']),
        isActive: true,
      })
      .returning();

    return {
      message: 'Search saved successfully',
      ...savedSearch,
      searchCriteria: dto.searchCriteria, // Return as object
      alertChannels: dto.alertChannels || ['email'], // Return as array
    };
  }

  /**
   * Get all active saved searches for the authenticated user
   * Sorted by creation date (newest first)
   *
   * IMPORTANT: This does NOT execute the search or call Elasticsearch
   */
  async findAll(user: any) {
    const userId = user.id;

    const savedSearches = await this.db
      .select()
      .from(schema.savedSearches)
      .where(
        and(
          eq(schema.savedSearches.userId, userId),
          eq(schema.savedSearches.isActive, true),
        ),
      )
      .orderBy(desc(schema.savedSearches.createdAt));

    // Parse JSON fields for response
    const formatted = savedSearches.map((search) => ({
      ...search,
      searchCriteria: JSON.parse(search.searchCriteria),
      alertChannels: search.alertChannels
        ? JSON.parse(search.alertChannels)
        : [],
    }));

    return {
      message: 'Saved searches retrieved successfully',
      data: formatted,
      total: formatted.length,
    };
  }

  /**
   * Update alert settings for a saved search
   * Only updates alert-related fields, NOT search criteria
   */
  async update(id: string, dto: UpdateSavedSearchDto, user: any) {
    const userId = user.id;

    // Find and verify ownership
    const [savedSearch] = await this.db
      .select()
      .from(schema.savedSearches)
      .where(
        and(
          eq(schema.savedSearches.id, id),
          eq(schema.savedSearches.isActive, true),
        ),
      )
      .limit(1);

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    if (savedSearch.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this saved search',
      );
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.alertEnabled !== undefined) {
      updateData.alertEnabled = dto.alertEnabled;
    }

    if (dto.alertFrequency !== undefined) {
      updateData.alertFrequency = dto.alertFrequency;
    }

    if (dto.alertChannels !== undefined) {
      updateData.alertChannels = JSON.stringify(dto.alertChannels);
    }

    // Update the record
    const [updated] = await this.db
      .update(schema.savedSearches)
      .set(updateData)
      .where(eq(schema.savedSearches.id, id))
      .returning();

    return {
      message: 'Saved search updated successfully',
      ...updated,
      searchCriteria: JSON.parse(updated.searchCriteria),
      alertChannels: updated.alertChannels
        ? JSON.parse(updated.alertChannels)
        : [],
    };
  }

  /**
   * Soft delete a saved search (sets isActive = false)
   * This preserves the record for analytics and potential future restoration
   */
  async remove(id: string, user: any) {
    const userId = user.id;

    // Find and verify ownership
    const [savedSearch] = await this.db
      .select()
      .from(schema.savedSearches)
      .where(
        and(
          eq(schema.savedSearches.id, id),
          eq(schema.savedSearches.isActive, true),
        ),
      )
      .limit(1);

    if (!savedSearch) {
      throw new NotFoundException('Saved search not found');
    }

    if (savedSearch.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this saved search',
      );
    }

    // Soft delete
    await this.db
      .update(schema.savedSearches)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(schema.savedSearches.id, id));

    return {
      message: 'Saved search deleted successfully',
    };
  }
}
