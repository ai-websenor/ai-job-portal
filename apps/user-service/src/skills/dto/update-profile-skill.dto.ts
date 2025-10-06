import { PartialType } from '@nestjs/swagger';
import { CreateProfileSkillDto } from './create-profile-skill.dto';

export class UpdateProfileSkillDto extends PartialType(CreateProfileSkillDto) {}
