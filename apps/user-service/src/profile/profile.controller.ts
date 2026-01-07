import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('candidate-profile')
@Controller('candidate/profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  @ApiOperation({ summary: 'Create user profile' })
  @ApiResponse({ status: 201, description: 'Profile created successfully' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async createProfile(@GetUser('id') userId: string, @Body() createProfileDto: CreateProfileDto) {
    return this.profileService.create(userId, createProfileDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getProfile(@GetUser('id') userId: string) {
    return this.profileService.findByUserId(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateProfile(@GetUser('id') userId: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.update(userId, updateProfileDto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user profile' })
  @ApiResponse({ status: 200, description: 'Profile deleted successfully' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async deleteProfile(@GetUser('id') userId: string) {
    return this.profileService.delete(userId);
  }

  @Get('completion')
  @ApiOperation({ summary: 'Get profile completion status' })
  @ApiResponse({ status: 200, description: 'Completion status retrieved' })
  async getCompletionStatus(@GetUser('id') userId: string) {
    return this.profileService.getCompletionStatus(userId);
  }
}
