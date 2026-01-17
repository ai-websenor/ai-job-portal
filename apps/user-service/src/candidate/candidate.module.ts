import { Module } from '@nestjs/common';
import { CandidateMetaController } from './candidate-meta.controller';
import { CandidateMetaService } from './candidate-meta.service';

@Module({
  controllers: [CandidateMetaController],
  providers: [CandidateMetaService],
})
export class CandidateModule {}
