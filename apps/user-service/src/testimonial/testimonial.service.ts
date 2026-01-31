import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { Database, companies, employeeTestimonials } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto';

@Injectable()
export class TestimonialService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getCompanyAndVerify(userId: string, companyId: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) throw new NotFoundException('Company not found');
    if (company.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return company;
  }

  async create(userId: string, companyId: string, dto: CreateTestimonialDto) {
    await this.getCompanyAndVerify(userId, companyId);

    const [testimonial] = await this.db.insert(employeeTestimonials).values({
      companyId,
      ...dto,
    }).returning();

    return testimonial;
  }

  async findAll(companyId: string, approvedOnly = true) {
    let whereClause = eq(employeeTestimonials.companyId, companyId);

    if (approvedOnly) {
      whereClause = and(whereClause, eq(employeeTestimonials.isApproved, true))!;
    }

    return this.db.query.employeeTestimonials.findMany({
      where: whereClause,
      orderBy: (t, { asc }) => [asc(t.displayOrder)],
    });
  }

  async findOne(companyId: string, id: string) {
    const testimonial = await this.db.query.employeeTestimonials.findFirst({
      where: and(eq(employeeTestimonials.id, id), eq(employeeTestimonials.companyId, companyId)),
    });

    if (!testimonial) throw new NotFoundException('Testimonial not found');
    return testimonial;
  }

  async update(userId: string, companyId: string, id: string, dto: UpdateTestimonialDto) {
    await this.getCompanyAndVerify(userId, companyId);

    const existing = await this.db.query.employeeTestimonials.findFirst({
      where: and(eq(employeeTestimonials.id, id), eq(employeeTestimonials.companyId, companyId)),
    });

    if (!existing) throw new NotFoundException('Testimonial not found');

    await this.db.update(employeeTestimonials)
      .set(dto)
      .where(eq(employeeTestimonials.id, id));

    return this.findOne(companyId, id);
  }

  async remove(userId: string, companyId: string, id: string) {
    await this.getCompanyAndVerify(userId, companyId);

    const existing = await this.db.query.employeeTestimonials.findFirst({
      where: and(eq(employeeTestimonials.id, id), eq(employeeTestimonials.companyId, companyId)),
    });

    if (!existing) throw new NotFoundException('Testimonial not found');

    await this.db.delete(employeeTestimonials).where(eq(employeeTestimonials.id, id));

    return { success: true };
  }
}
