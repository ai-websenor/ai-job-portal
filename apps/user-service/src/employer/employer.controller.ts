import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EmployerService } from './employer.service';
import { CurrentUser, Roles, RolesGuard } from '@ai-job-portal/common';
import { UpdateEmployerProfileDto } from './dto';

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
  @ApiOperation({ summary: 'Get employer profile with company and subscription details' })
  getProfile(@CurrentUser('sub') userId: string) {
    return this.employerService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update employer profile',
    description: 'Supports partial updates - only provided fields will be updated',
  })
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateEmployerProfileDto) {
    return this.employerService.updateProfile(userId, dto);
  }
}
