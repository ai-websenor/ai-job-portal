import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocsController } from './docs.controller';

@Module({
  imports: [ConfigModule],
  controllers: [DocsController],
})
export class DocsModule {}
