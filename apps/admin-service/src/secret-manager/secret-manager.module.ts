import { Module } from '@nestjs/common';
import { SecretManagerController } from './secret-manager.controller';
import { SecretManagerService } from './secret-manager.service';
import { VaultService } from './vault.service';
import { VaultGuard } from './vault.guard';

@Module({
  controllers: [SecretManagerController],
  providers: [SecretManagerService, VaultService, VaultGuard],
  exports: [SecretManagerService, VaultService],
})
export class SecretManagerModule {}
