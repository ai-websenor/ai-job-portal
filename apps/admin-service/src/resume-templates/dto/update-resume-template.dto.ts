import { PartialType } from '@nestjs/swagger';
import { CreateResumeTemplateDto } from './create-resume-template.dto';

export class UpdateResumeTemplateDto extends PartialType(CreateResumeTemplateDto) {}
