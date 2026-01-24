import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { TeamService } from './team.service';
import { InviteTeamMemberDto, UpdateTeamMemberDto, TeamMemberQueryDto } from './dto';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('companies/:companyId/team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Invite team member' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  invite(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
    @Body() dto: InviteTeamMemberDto,
  ) {
    return this.teamService.invite(userId, companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get team members' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Team members retrieved' })
  getTeamMembers(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
    @Query() query: TeamMemberQueryDto,
  ) {
    return this.teamService.getTeamMembers(userId, companyId, query);
  }

  @Put(':memberId/role')
  @ApiOperation({ summary: 'Update team member role' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'memberId', description: 'Team member ID' })
  @ApiResponse({ status: 200, description: 'Member updated' })
  updateMember(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.teamService.updateMember(userId, companyId, memberId, dto);
  }

  @Delete(':memberId')
  @ApiOperation({ summary: 'Remove team member' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiParam({ name: 'memberId', description: 'Team member ID' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  removeMember(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamService.removeMember(userId, companyId, memberId);
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept team invitation' })
  @ApiParam({ name: 'companyId', description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  acceptInvite(
    @CurrentUser('sub') userId: string,
    @Param('companyId') companyId: string,
  ) {
    return this.teamService.acceptInvite(userId, companyId);
  }
}

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users/me/teams')
export class MyTeamsController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  @ApiOperation({ summary: 'Get teams I belong to' })
  @ApiResponse({ status: 200, description: 'Teams retrieved' })
  getMyTeams(@CurrentUser('sub') userId: string) {
    return this.teamService.getMyTeams(userId);
  }
}
