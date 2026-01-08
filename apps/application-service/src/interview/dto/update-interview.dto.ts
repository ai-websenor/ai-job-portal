import { PartialType } from '@nestjs/swagger';
import { ScheduleInterviewDto } from './schedule-interview.dto';

export class UpdateInterviewDto extends PartialType(ScheduleInterviewDto) {}
