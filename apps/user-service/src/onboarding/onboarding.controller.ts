import {
    Controller,
    Post,
    Body,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiConsumes,
    ApiBody,
} from '@nestjs/swagger';
import { FastifyFileInterceptor } from '../common/interceptors/fastify-file.interceptor';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { CreateProfileDto } from '../profile/dto/create-profile.dto';
import { CreateProfileSkillDto } from '../skills/dto/create-profile-skill.dto';
import { CreateEducationDto } from '../education/dto/create-education.dto';
import { CreateWorkExperienceDto } from '../work-experience/dto/create-work-experience.dto';
import { UpdateJobPreferencesDto } from '../preferences/dto/update-job-preferences.dto';

@ApiTags('onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) { }

    @Post('personal-info')
    @ApiOperation({ summary: 'Create user profile (personal information)' })
    @ApiResponse({ status: 201, description: 'Profile created successfully' })
    @ApiResponse({ status: 409, description: 'Profile already exists' })
    async createPersonalInfo(
        @GetUser('id') userId: string,
        @Body() createDto: CreateProfileDto,
    ) {
        return this.onboardingService.createPersonalInfo(userId, createDto);
    }

    @Post('education')
    @ApiOperation({ summary: 'Add education record to profile' })
    @ApiResponse({ status: 201, description: 'Education record added successfully' })
    async addEducation(
        @GetUser('id') userId: string,
        @Body() createDto: CreateEducationDto,
    ) {
        return this.onboardingService.addEducation(userId, createDto);
    }

    @Post('skills')
    @ApiOperation({ summary: 'Add skill to profile' })
    @ApiResponse({ status: 201, description: 'Skill added successfully' })
    async addSkill(
        @GetUser('id') userId: string,
        @Body() createDto: CreateProfileSkillDto,
    ) {
        return this.onboardingService.addSkill(userId, createDto);
    }

    @Post('experience')
    @ApiOperation({ summary: 'Add work experience to profile' })
    @ApiResponse({ status: 201, description: 'Work experience added successfully' })
    async addExperience(
        @GetUser('id') userId: string,
        @Body() createDto: CreateWorkExperienceDto,
    ) {
        return this.onboardingService.addExperience(userId, createDto);
    }

    @Post('preferences')
    @ApiOperation({ summary: 'Create/update job preferences' })
    @ApiResponse({ status: 201, description: 'Preferences updated successfully' })
    async updatePreferences(
        @GetUser('id') userId: string,
        @Body() updateDto: UpdateJobPreferencesDto,
    ) {
        return this.onboardingService.updatePreferences(userId, updateDto);
    }

    @Post('resume')
    @UseInterceptors(FastifyFileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload resume file' })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['file', 'resumeName'],
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
                resumeName: {
                    type: 'string',
                },
                isDefault: {
                    type: 'boolean',
                },
                isBuiltWithBuilder: {
                    type: 'boolean',
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Resume uploaded successfully' })
    async uploadResume(
        @GetUser('id') userId: string,
        @UploadedFile() file: any,
        @Body('resumeName') resumeName: string,
        @Body('isDefault') isDefault?: boolean,
        @Body('isBuiltWithBuilder') isBuiltWithBuilder?: boolean,
    ) {
        if (!file) throw new BadRequestException('File is required');
        if (!resumeName) throw new BadRequestException('resumeName is required');

        return this.onboardingService.uploadAndParseResume({
            userId,
            file,
            resumeName,
        });
    }
}
