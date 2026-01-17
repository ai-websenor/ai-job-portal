import { Injectable, Inject, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { Database, companies, teamMembersCollaboration, users } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { InviteTeamMemberDto, UpdateTeamMemberDto, TeamMemberQueryDto } from './dto';

@Injectable()
export class TeamService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  private async getCompanyId(userId: string): Promise<string> {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.userId, userId),
    });
    if (!company) throw new NotFoundException('Company not found');
    return company.id;
  }

  private async verifyCompanyAccess(userId: string, companyId: string, requireAdmin = false) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) throw new NotFoundException('Company not found');

    // Check if user is company owner
    if (company.userId === userId) return true;

    // Check if user is team member with appropriate role
    const member = await this.db.query.teamMembersCollaboration.findFirst({
      where: and(
        eq(teamMembersCollaboration.companyId, companyId),
        eq(teamMembersCollaboration.userId, userId),
        eq(teamMembersCollaboration.isActive, true),
      ),
    });

    if (!member) throw new ForbiddenException('Not authorized');
    if (requireAdmin && member.role !== 'admin') {
      throw new ForbiddenException('Admin role required');
    }

    return true;
  }

  async invite(userId: string, companyId: string, dto: InviteTeamMemberDto) {
    await this.verifyCompanyAccess(userId, companyId, true);

    // Find user by email
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    if (!user) throw new NotFoundException('User not found with this email');

    // Check if already a member
    const existing = await this.db.query.teamMembersCollaboration.findFirst({
      where: and(
        eq(teamMembersCollaboration.companyId, companyId),
        eq(teamMembersCollaboration.userId, user.id),
      ),
    });

    if (existing) throw new ConflictException('User is already a team member');

    const [member] = await this.db.insert(teamMembersCollaboration).values({
      companyId,
      userId: user.id,
      role: dto.role,
      permissions: dto.permissions,
      invitedBy: userId,
    }).returning();

    return member;
  }

  async getTeamMembers(userId: string, companyId: string, query: TeamMemberQueryDto) {
    await this.verifyCompanyAccess(userId, companyId);

    let whereClause = eq(teamMembersCollaboration.companyId, companyId);

    if (query.role) {
      whereClause = and(whereClause, eq(teamMembersCollaboration.role, query.role))!;
    }

    if (query.isActive !== undefined) {
      whereClause = and(whereClause, eq(teamMembersCollaboration.isActive, query.isActive))!;
    }

    return this.db.query.teamMembersCollaboration.findMany({
      where: whereClause,
      orderBy: (m, { desc }) => [desc(m.createdAt)],
    });
  }

  async updateMember(userId: string, companyId: string, memberId: string, dto: UpdateTeamMemberDto) {
    await this.verifyCompanyAccess(userId, companyId, true);

    const member = await this.db.query.teamMembersCollaboration.findFirst({
      where: and(
        eq(teamMembersCollaboration.id, memberId),
        eq(teamMembersCollaboration.companyId, companyId),
      ),
    });

    if (!member) throw new NotFoundException('Team member not found');

    await this.db.update(teamMembersCollaboration)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(teamMembersCollaboration.id, memberId));

    return this.db.query.teamMembersCollaboration.findFirst({
      where: eq(teamMembersCollaboration.id, memberId),
    });
  }

  async removeMember(userId: string, companyId: string, memberId: string) {
    await this.verifyCompanyAccess(userId, companyId, true);

    const member = await this.db.query.teamMembersCollaboration.findFirst({
      where: and(
        eq(teamMembersCollaboration.id, memberId),
        eq(teamMembersCollaboration.companyId, companyId),
      ),
    });

    if (!member) throw new NotFoundException('Team member not found');

    await this.db.delete(teamMembersCollaboration).where(eq(teamMembersCollaboration.id, memberId));

    return { success: true };
  }

  async acceptInvite(userId: string, companyId: string) {
    const member = await this.db.query.teamMembersCollaboration.findFirst({
      where: and(
        eq(teamMembersCollaboration.companyId, companyId),
        eq(teamMembersCollaboration.userId, userId),
      ),
    });

    if (!member) throw new NotFoundException('Invitation not found');
    if (member.acceptedAt) throw new ConflictException('Invitation already accepted');

    await this.db.update(teamMembersCollaboration)
      .set({ acceptedAt: new Date(), isActive: true })
      .where(eq(teamMembersCollaboration.id, member.id));

    return { success: true, message: 'Invitation accepted' };
  }

  async getMyTeams(userId: string) {
    return this.db.query.teamMembersCollaboration.findMany({
      where: and(
        eq(teamMembersCollaboration.userId, userId),
        eq(teamMembersCollaboration.isActive, true),
      ),
      with: {
        company: true,
      },
    });
  }
}
