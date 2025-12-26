import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { ProfileModule } from '../profile/profile.module';
import { SkillsModule } from '../skills/skills.module';
import { EducationModule } from '../education/education.module';
import { WorkExperienceModule } from '../work-experience/work-experience.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { ResumesModule } from '../resumes/resumes.module';
import { GrpcModule } from '../grpc/grpc.module';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [
        GrpcModule,
        DatabaseModule,
        ProfileModule,
        SkillsModule,
        EducationModule,
        WorkExperienceModule,
        PreferencesModule,
        ResumesModule,
    ],
    controllers: [OnboardingController],
    providers: [OnboardingService],
    exports: [OnboardingService],
})
export class OnboardingModule { }

