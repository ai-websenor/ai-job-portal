import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EmployerService } from './employer.service';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';

@ApiTags('employers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('employer')
@Controller('employers')
export class EmployerController {
  constructor(private readonly employerService: EmployerService) {}

  @Post('profile')
  @ApiOperation({ summary: 'Create employer profile' })
  createProfile(@CurrentUser('sub') userId: string, @Body() dto: any) {
    return this.employerService.createProfile(userId, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get employer profile' })
  getProfile(@CurrentUser('sub') userId: string) {
    return this.employerService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update employer profile' })
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: any) {
    return this.employerService.updateProfile(userId, dto);
  }

  @Post('locations')
  @ApiOperation({ summary: 'Add office location' })
  addLocation(@CurrentUser('sub') userId: string, @Body() dto: any) {
    return this.employerService.addLocation(userId, dto);
  }
}
