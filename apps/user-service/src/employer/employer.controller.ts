import { Controller, Patch, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EmployerService } from './employer.service';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('employers')
@Controller('employers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EmployerController {
  constructor(private readonly employerService: EmployerService) {}

  @Patch('me/profile/visibility')
  @ApiOperation({ summary: 'Update employer profile visibility' })
  @ApiResponse({
    status: 200,
    description: 'Profile visibility updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid visibility value' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not an employer' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateVisibility(@GetUser() user: any, @Body() updateVisibilityDto: UpdateVisibilityDto) {
    // Role Check
    if (user.role !== 'employer') {
      throw new ForbiddenException('Access denied. Employers only.');
    }

    return this.employerService.updateVisibility(user.id, updateVisibilityDto.visibility);
  }
}
