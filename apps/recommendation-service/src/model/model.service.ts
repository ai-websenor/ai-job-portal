import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { Database, mlModels } from '@ai-job-portal/database';
import { DATABASE_CLIENT } from '../database/database.module';
import { CreateModelDto, UpdateModelDto } from './dto';

@Injectable()
export class ModelService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: Database) {}

  async create(createdBy: string, dto: CreateModelDto) {
    // Check if version already exists for this model
    const existing = await this.db.query.mlModels.findFirst({
      where: and(
        eq(mlModels.modelName, dto.modelName),
        eq(mlModels.modelVersion, dto.modelVersion),
      ),
    });

    if (existing) {
      throw new ConflictException('Model with this name and version already exists');
    }

    const [model] = await this.db.insert(mlModels).values({
      modelName: dto.modelName,
      modelVersion: dto.modelVersion,
      algorithmType: dto.algorithmType,
      parameters: dto.parameters ? JSON.stringify(dto.parameters) : null,
      performanceMetrics: dto.performanceMetrics ? JSON.stringify(dto.performanceMetrics) : null,
      trainingDate: dto.trainingDate ? new Date(dto.trainingDate) : null,
      isActive: false,
      createdBy,
    }).returning();

    return this.formatModel(model);
  }

  async findAll() {
    const models = await this.db.query.mlModels.findMany({
      orderBy: [desc(mlModels.createdAt)],
    });

    return models.map(m => this.formatModel(m));
  }

  async findOne(id: string) {
    const model = await this.db.query.mlModels.findFirst({
      where: eq(mlModels.id, id),
    });

    if (!model) throw new NotFoundException('Model not found');

    return this.formatModel(model);
  }

  async findActive(modelName?: string) {
    const conditions = [eq(mlModels.isActive, true)];
    if (modelName) {
      conditions.push(eq(mlModels.modelName, modelName));
    }

    const models = await this.db.query.mlModels.findMany({
      where: and(...conditions),
      orderBy: [desc(mlModels.deploymentDate)],
    });

    return models.map(m => this.formatModel(m));
  }

  async update(id: string, dto: UpdateModelDto) {
    const updateData: any = {};

    if (dto.algorithmType !== undefined) updateData.algorithmType = dto.algorithmType;
    if (dto.parameters !== undefined) updateData.parameters = JSON.stringify(dto.parameters);
    if (dto.performanceMetrics !== undefined) updateData.performanceMetrics = JSON.stringify(dto.performanceMetrics);
    if (dto.trainingDate !== undefined) updateData.trainingDate = new Date(dto.trainingDate);
    if (dto.deploymentDate !== undefined) updateData.deploymentDate = new Date(dto.deploymentDate);
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const [updated] = await this.db.update(mlModels)
      .set(updateData)
      .where(eq(mlModels.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Model not found');

    return this.formatModel(updated);
  }

  async deploy(id: string) {
    const model = await this.db.query.mlModels.findFirst({
      where: eq(mlModels.id, id),
    });

    if (!model) throw new NotFoundException('Model not found');

    // Deactivate other models of the same name
    await this.db.update(mlModels)
      .set({ isActive: false })
      .where(and(
        eq(mlModels.modelName, model.modelName),
        eq(mlModels.isActive, true),
      ));

    // Activate this model
    const [updated] = await this.db.update(mlModels)
      .set({
        isActive: true,
        deploymentDate: new Date(),
      })
      .where(eq(mlModels.id, id))
      .returning();

    return {
      success: true,
      message: `Model ${model.modelName} v${model.modelVersion} deployed`,
      model: this.formatModel(updated),
    };
  }

  async undeploy(id: string) {
    const [updated] = await this.db.update(mlModels)
      .set({ isActive: false })
      .where(eq(mlModels.id, id))
      .returning();

    if (!updated) throw new NotFoundException('Model not found');

    return {
      success: true,
      message: 'Model deactivated',
      model: this.formatModel(updated),
    };
  }

  async remove(id: string) {
    const model = await this.db.query.mlModels.findFirst({
      where: eq(mlModels.id, id),
    });

    if (!model) throw new NotFoundException('Model not found');

    if (model.isActive) {
      throw new ConflictException('Cannot delete an active model. Undeploy it first.');
    }

    await this.db.delete(mlModels).where(eq(mlModels.id, id));

    return { success: true, message: 'Model deleted' };
  }

  private formatModel(model: any) {
    return {
      ...model,
      parameters: model.parameters ? JSON.parse(model.parameters) : null,
      performanceMetrics: model.performanceMetrics ? JSON.parse(model.performanceMetrics) : null,
    };
  }
}
