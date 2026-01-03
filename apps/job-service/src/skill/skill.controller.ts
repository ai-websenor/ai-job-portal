import { Controller, Post, Body, Get } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkillService } from './skill.service';
import { CreateSkillDto } from './dto/create-skill.dto';

@ApiTags('skills')
@Controller('skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new skill' })
  @ApiResponse({ status: 201, description: 'The skill has been successfully created.' })
  createHttp(@Body() data: CreateSkillDto) {
    return this.skillService.create(data);
  }

  @GrpcMethod('JobService', 'CreateSkill')
  create(data: CreateSkillDto) {
    return this.skillService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Find all skills' })
  @ApiResponse({ status: 200, description: 'Return all skills.' })
  findAllHttp() {
    return this.skillService.findAll();
  }

  @GrpcMethod('JobService', 'FindAllSkills')
  findAll() {
    return this.skillService.findAll();
  }
}
