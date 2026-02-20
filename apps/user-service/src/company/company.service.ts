import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Database, companies, employers } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { UpdateCompanyDto } from './dto';

@Injectable()
export class CompanyService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  /**
   * Get company profile for a super_employer.
   * Looks up the company via the employer's companyId.
   * Sensitive fields (PAN, GST, CIN) are masked.
   */
  async getCompanyProfile(userId: string) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer) {
      throw new NotFoundException('Employer profile not found');
    }

    if (!employer.companyId) {
      throw new ForbiddenException('No company assigned to this employer');
    }

    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, employer.companyId),
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return {
      ...company,
      panNumber: this.maskString(company.panNumber),
      gstNumber: this.maskString(company.gstNumber),
      cinNumber: this.maskString(company.cinNumber),
    };
  }

  /**
   * Update company profile for a super_employer.
   * Restricted fields are stripped before update.
   */
  async updateCompanyProfile(userId: string, dto: UpdateCompanyDto) {
    const employer = await this.db.query.employers.findFirst({
      where: eq(employers.userId, userId),
    });

    if (!employer) {
      throw new NotFoundException('Employer profile not found');
    }

    if (!employer.companyId) {
      throw new ForbiddenException('No company assigned to this employer');
    }

    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, employer.companyId),
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Strip any restricted fields that might have been passed
    const { ...allowedFields } = dto as any;

    // Remove restricted fields explicitly
    delete allowedFields.panNumber;
    delete allowedFields.gstNumber;
    delete allowedFields.cinNumber;
    delete allowedFields.logoUrl;
    delete allowedFields.verificationDocuments;
    delete allowedFields.kycDocuments;
    delete allowedFields.isVerified;
    delete allowedFields.verificationStatus;

    await this.db
      .update(companies)
      .set({
        ...allowedFields,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, employer.companyId));

    const updatedCompany = await this.db.query.companies.findFirst({
      where: eq(companies.id, employer.companyId),
    });

    if (!updatedCompany) {
      throw new NotFoundException('Company not found after update');
    }

    return {
      ...updatedCompany,
      panNumber: this.maskString(updatedCompany.panNumber),
      gstNumber: this.maskString(updatedCompany.gstNumber),
      cinNumber: this.maskString(updatedCompany.cinNumber),
    };
  }

  /**
   * Mask sensitive string fields for security.
   * Example: "ABCDE1234F" -> "ABC****34F"
   */
  private maskString(value: string | null): string | null {
    if (!value || value.length <= 6) {
      return value ? '***' : null;
    }
    const visibleStart = 3;
    const visibleEnd = 2;
    return value.substring(0, visibleStart) + '****' + value.substring(value.length - visibleEnd);
  }
}
