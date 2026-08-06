import { Injectable } from '@nestjs/common';
import { eq, or, and, ilike, sql } from 'drizzle-orm';
import { jobs } from '@ai-job-portal/database';

@Injectable()
export class SearchConditionBuilder {
  /**
   * Converts user wildcard pattern to SQL LIKE pattern
   * Supports: "A*" -> "A%", "*developer" -> "%developer", "full stack" -> "%full stack%"
   */
  convertWildcardToSql(pattern: string): string {
    // Replace * with % for SQL LIKE
    let sqlPattern = pattern.replace(/\*/g, '%');

    // If no wildcards present, wrap with % for partial matching
    if (!pattern.includes('*')) {
      sqlPattern = `%${sqlPattern}%`;
    }

    return sqlPattern;
  }

  /**
   * Builds a SQL condition for experience level filters.
   * Handles numeric values ("2" → falls in [experienceMin, experienceMax])
   * and plus-suffixed values ("5+" → experienceMax >= 5).
   * Falls back to text match on experienceLevel for non-numeric values.
   */
  buildExperienceCondition(experienceLevels: string[]) {
    const expConditions = experienceLevels.map((level) => {
      const isPlus = level.endsWith('+');
      const years = parseInt(isPlus ? level.slice(0, -1) : level, 10);

      if (isNaN(years)) {
        return eq(jobs.experienceLevel, level as any);
      }

      if (isPlus) {
        // "5+" → job accepts candidates with 5+ years
        return sql`(${jobs.experienceMax} >= ${years} OR ${jobs.experienceMax} IS NULL)`;
      }

      // "2" → job range should include 2 years
      return sql`(${jobs.experienceMin} IS NULL OR ${jobs.experienceMin} <= ${years}) AND (${jobs.experienceMax} IS NULL OR ${jobs.experienceMax} >= ${years})`;
    });

    return or(...expConditions);
  }

  /**
   * Builds robust query search conditions.
   * Matches full phrase and individual words against:
   * Title, Description, Skills, Categories, and Subcategories.
   * Prioritizes matches in the Job Title.
   */
  buildSearchQueryCondition(query: string, searchPattern: string) {
    const queryWords = query
      .replace(/\*/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 1);

    const exactPhraseCondition = or(
      ilike(jobs.title, searchPattern),
      ilike(jobs.description, searchPattern),
      sql`EXISTS (
        SELECT 1 FROM unnest(${jobs.skills}) AS skill
        WHERE skill ILIKE ${searchPattern}
      )`,
      sql`EXISTS (
        SELECT 1 FROM job_categories
        WHERE job_categories.id = ${jobs.categoryId}
        AND job_categories.name ILIKE ${searchPattern}
      )`,
      sql`EXISTS (
        SELECT 1 FROM job_categories
        WHERE job_categories.id = ${jobs.subCategoryId}
        AND job_categories.name ILIKE ${searchPattern}
      )`,
    );

    const allWordsMatchCondition =
      queryWords.length > 0
        ? and(
            ...queryWords.map((w) =>
              or(
                ilike(jobs.title, `%${w}%`),
                ilike(jobs.description, `%${w}%`),
                sql`EXISTS (
                SELECT 1 FROM unnest(${jobs.skills}) AS skill
                WHERE skill ILIKE ${'%' + w + '%'}
              )`,
                sql`EXISTS (
                SELECT 1 FROM job_categories
                WHERE job_categories.id = ${jobs.categoryId}
                AND job_categories.name ILIKE ${'%' + w + '%'}
              )`,
                sql`EXISTS (
                SELECT 1 FROM job_categories
                WHERE job_categories.id = ${jobs.subCategoryId}
                AND job_categories.name ILIKE ${'%' + w + '%'}
              )`,
              ),
            ),
          )
        : sql`true`;

    const anyWordInTitleCondition =
      queryWords.length > 0
        ? or(...queryWords.map((w) => ilike(jobs.title, `%${w}%`)))
        : sql`false`;

    return or(exactPhraseCondition, allWordsMatchCondition, anyWordInTitleCondition);
  }
}
