import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ModelService } from './model.service';
import { CreateModelDto, UpdateModelDto, DeployModelDto } from './dto';

@ApiTags('admin-models')
@ApiBearerAuth()
@Controller('admin/models')
export class ModelController {
  constructor(private readonly modelService: ModelService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new ML model' })
  async create(@Body() dto: CreateModelDto) {
    // TODO: Get adminId from JWT token
    const createdBy = 'admin-placeholder';
    return this.modelService.create(createdBy, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all ML models' })
  async findAll() {
    return this.modelService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get currently active models' })
  @ApiQuery({ name: 'modelName', required: false, description: 'Filter by model name' })
  async findActive(@Query('modelName') modelName?: string) {
    return this.modelService.findActive(modelName);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get model by ID' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async findOne(@Param('id') id: string) {
    return this.modelService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update model metadata' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateModelDto) {
    return this.modelService.update(id, dto);
  }

  @Post(':id/deploy')
  @ApiOperation({ summary: 'Deploy model (activate and deactivate previous version)' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async deploy(@Param('id') id: string, @Body() dto?: DeployModelDto) {
    return this.modelService.deploy(id);
  }

  @Post(':id/undeploy')
  @ApiOperation({ summary: 'Undeploy model (deactivate)' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async undeploy(@Param('id') id: string) {
    return this.modelService.undeploy(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete model (only inactive models)' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async remove(@Param('id') id: string) {
    return this.modelService.remove(id);
  }
}
