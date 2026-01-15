/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, count } from 'drizzle-orm';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CustomLogger } from '@ai-job-portal/logger';

@Injectable()
export class CompanyService {
  private readonly logger = new CustomLogger();

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /**
   * Get company by ID (public)
   */
  async findOne(id: string) {
    const [company] = await this.db
      .select({
        id: schema.companies.id,
        name: schema.companies.name,
        slug: schema.companies.slug,
        industry: schema.companies.industry,
        companyType: schema.companies.companyType,
        companySize: schema.companies.companySize,
        yearEstablished: schema.companies.yearEstablished,
        website: schema.companies.website,
        description: schema.companies.description,
        mission: schema.companies.mission,
        culture: schema.companies.culture,
        benefits: schema.companies.benefits,
        logoUrl: schema.companies.logoUrl,
        bannerUrl: schema.companies.bannerUrl,
        tagline: schema.companies.tagline,
        isVerified: schema.companies.isVerified,
        createdAt: schema.companies.createdAt,
        updatedAt: schema.companies.updatedAt,
      })
      .from(schema.companies)
      .where(eq(schema.companies.id, id))
      .limit(1);

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return {
      message: 'Company retrieved successfully',
      ...company,
    };
  }

  /**
   * Get authenticated employer's company profile
   */
  async findMyCompany(user: any) {
    // Get employer profile
    const [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, user.id))
      .limit(1);

    if (!employer) {
      throw new ForbiddenException(
        'You must be an employer to access company profiles',
      );
    }

    if (!employer.companyId) {
      throw new NotFoundException(
        'Your employer profile is not linked to a company. Please contact support.',
      );
    }

    // Get company details
    const [company] = await this.db
      .select({
        id: schema.companies.id,
        name: schema.companies.name,
        slug: schema.companies.slug,
        industry: schema.companies.industry,
        companyType: schema.companies.companyType,
        companySize: schema.companies.companySize,
        yearEstablished: schema.companies.yearEstablished,
        website: schema.companies.website,
        description: schema.companies.description,
        mission: schema.companies.mission,
        culture: schema.companies.culture,
        benefits: schema.companies.benefits,
        logoUrl: schema.companies.logoUrl,
        bannerUrl: schema.companies.bannerUrl,
        tagline: schema.companies.tagline,
        isVerified: schema.companies.isVerified,
        createdAt: schema.companies.createdAt,
        updatedAt: schema.companies.updatedAt,
      })
      .from(schema.companies)
      .where(eq(schema.companies.id, employer.companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundException(
        `Company with ID ${employer.companyId} not found`,
      );
    }

    return {
      message: 'Company profile retrieved successfully',
      ...company,
    };
  }

  /**
   * Update company (employer only, with ownership check)
   */
  async update(id: string, updateDto: UpdateCompanyDto, user: any) {
    // Verify employer owns this company
    const [employer] = await this.db
      .select()
      .from(schema.employers)
      .where(eq(schema.employers.userId, user.id))
      .limit(1);

    if (!employer) {
      throw new ForbiddenException(
        'You must be an employer to update company profiles',
      );
    }

    if (employer.companyId !== id) {
      throw new ForbiddenException('You do not own this company');
    }

    // Check if company exists
    const [existingCompany] = await this.db
      .select()
      .from(schema.companies)
      .where(eq(schema.companies.id, id))
      .limit(1);

    if (!existingCompany) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    // Update company
    const [updatedCompany] = await this.db
      .update(schema.companies)
      .set({
        description: updateDto.description,
        website: updateDto.website,
        logoUrl: updateDto.logoUrl,
        bannerUrl: updateDto.bannerUrl,
        tagline: updateDto.tagline,
        industry: updateDto.industry,
        companySize: updateDto.companySize,
        yearEstablished: updateDto.yearEstablished,
        mission: updateDto.mission,
        culture: updateDto.culture,
        benefits: updateDto.benefits,
        updatedAt: new Date(),
      })
      .where(eq(schema.companies.id, id))
      .returning();

    this.logger.success('Company updated successfully', 'CompanyService', {
      companyId: id,
      employerId: employer.id,
    });

    return {
      message: 'Company updated successfully',
      ...updatedCompany,
    };
  }

  /**
   * Get company by slug (public)
   * Slug is a URL-safe unique identifier used for public company pages
   * Example: /companies/slug/google
   */
  async findBySlug(slug: string) {
    const [company] = await this.db
      .select({
        id: schema.companies.id,
        name: schema.companies.name,
        slug: schema.companies.slug,
        industry: schema.companies.industry,
        companyType: schema.companies.companyType,
        companySize: schema.companies.companySize,
        yearEstablished: schema.companies.yearEstablished,
        website: schema.companies.website,
        description: schema.companies.description,
        mission: schema.companies.mission,
        culture: schema.companies.culture,
        benefits: schema.companies.benefits,
        logoUrl: schema.companies.logoUrl,
        bannerUrl: schema.companies.bannerUrl,
        tagline: schema.companies.tagline,
        isVerified: schema.companies.isVerified,
        createdAt: schema.companies.createdAt,
        updatedAt: schema.companies.updatedAt,
      })
      .from(schema.companies)
      .where(eq(schema.companies.slug, slug))
      .limit(1);

    if (!company) {
      throw new NotFoundException(`Company with slug "${slug}" not found`);
    }

    return {
      message: 'Company retrieved successfully',
      ...company,
    };
  }

  /**
   * Get all active jobs for a company (public)
   * Returns paginated list of jobs with default sorting by createdAt DESC
   */
  async getCompanyJobs(companyId: string, query: any) {
    const limit = query.limit || 10;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    // Verify company exists
    const [company] = await this.db
      .select({ id: schema.companies.id })
      .from(schema.companies)
      .where(eq(schema.companies.id, companyId))
      .limit(1);

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // Fetch jobs for this company
    const jobs = await this.db
      .select({
        id: schema.jobs.id,
        title: schema.jobs.title,
        description: schema.jobs.description,
        jobType: schema.jobs.jobType,
        workType: schema.jobs.workType,
        experienceLevel: schema.jobs.experienceLevel,
        location: schema.jobs.location,
        city: schema.jobs.city,
        state: schema.jobs.state,
        salaryMin: schema.jobs.salaryMin,
        salaryMax: schema.jobs.salaryMax,
        payRate: schema.jobs.payRate,
        showSalary: schema.jobs.showSalary,
        skills: schema.jobs.skills,
        deadline: schema.jobs.deadline,
        isActive: schema.jobs.isActive,
        viewCount: schema.jobs.viewCount,
        applicationCount: schema.jobs.applicationCount,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
      })
      .from(schema.jobs)
      .where(eq(schema.jobs.companyId, companyId))
      .orderBy(schema.jobs.createdAt) // Default sort: newest first (DESC is default in Drizzle)
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countRes] = await this.db
      .select({ count: count() })
      .from(schema.jobs)
      .where(eq(schema.jobs.companyId, companyId));

    const total = countRes?.count || 0;

    this.logger.success(
      'Company jobs retrieved successfully',
      'CompanyService',
      {
        companyId,
        count: jobs.length,
        page,
        limit,
      },
    );

    return {
      message:
        jobs.length > 0 ? 'Jobs retrieved successfully' : 'No jobs found',
      jobs,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }
}
