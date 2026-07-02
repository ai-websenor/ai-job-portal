import { Controller, Get, Post, Put, Body, Param, Headers, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FastifyRequest } from 'fastify';
import { RolesGuard, Roles, CurrentUser } from '@ai-job-portal/common';
import { VaultService } from './vault.service';
import { SecretManagerService } from './secret-manager.service';
import { VaultGuard } from './vault.guard';
import {
  SetupVaultDto,
  ConfirmTotpDto,
  UnlockVaultDto,
  UpdateSecretDto,
  RevealSecretDto,
  ChangePassphraseDto,
  RecoveryConfirmDto,
} from './dto';

@ApiTags('Admin - Secret Manager')
@ApiBearerAuth()
@Controller('secret-manager')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'super_admin')
export class SecretManagerController {
  constructor(
    private readonly vault: VaultService,
    private readonly secrets: SecretManagerService,
  ) {}

  // ---------- vault lifecycle (no vault session required) ----------

  @Get('status')
  @ApiOperation({ summary: 'Vault status (configured / TOTP enabled / locked)' })
  async status(@CurrentUser('sub') userId: string) {
    return this.vault.status(userId);
  }

  @Post('setup')
  @ApiOperation({ summary: 'First-time vault setup: passphrase + recovery contacts + TOTP enroll' })
  async setup(
    @CurrentUser('sub') userId: string,
    @CurrentUser('email') email: string,
    @Body() dto: SetupVaultDto,
  ) {
    return this.vault.setup(userId, dto.passphrase, dto.recoveryEmail, dto.recoveryMobile, email);
  }

  @Post('setup/confirm')
  @ApiOperation({ summary: 'Confirm first TOTP code to enable the vault' })
  async confirmTotp(@CurrentUser('sub') userId: string, @Body() dto: ConfirmTotpDto) {
    return this.vault.confirmTotp(userId, dto.totp);
  }

  @Post('unlock')
  @ApiOperation({ summary: 'Unlock the vault (passphrase + TOTP) -> 20-minute vault token' })
  async unlock(
    @CurrentUser('sub') userId: string,
    @Body() dto: UnlockVaultDto,
    @Req() req: FastifyRequest,
  ) {
    return this.vault.unlock(userId, dto.passphrase, dto.totp, req.ip);
  }

  @Post('lock')
  @ApiOperation({ summary: 'Lock the vault (revoke the current vault session)' })
  async lock(@Headers('x-vault-token') vaultToken: string) {
    return this.vault.lock(vaultToken || '');
  }

  @Post('change-passphrase')
  @UseGuards(VaultGuard)
  @ApiOperation({ summary: 'Change vault passphrase (requires unlocked vault + TOTP)' })
  async changePassphrase(@CurrentUser('sub') userId: string, @Body() dto: ChangePassphraseDto) {
    return this.vault.changePassphrase(userId, dto.currentPassphrase, dto.newPassphrase, dto.totp);
  }

  // ---------- recovery (JWT only, no vault session) ----------

  @Post('recovery/request')
  @ApiOperation({ summary: 'Send dual-channel (email + mobile) OTP to reset the passphrase' })
  async requestRecovery(@CurrentUser('sub') userId: string) {
    return this.vault.requestRecovery(userId);
  }

  @Post('recovery/confirm')
  @ApiOperation({ summary: 'Reset passphrase with both email and mobile OTP' })
  async confirmRecovery(@CurrentUser('sub') userId: string, @Body() dto: RecoveryConfirmDto) {
    return this.vault.confirmRecovery(userId, dto.emailOtp, dto.mobileOtp, dto.newPassphrase);
  }

  // ---------- secrets (require a live vault session) ----------

  @Get('secrets')
  @UseGuards(VaultGuard)
  @ApiOperation({ summary: 'List all manageable secrets (masked), grouped by category' })
  async listSecrets() {
    return this.secrets.listSecrets();
  }

  @Put('secrets/:key')
  @UseGuards(VaultGuard)
  @ApiOperation({ summary: 'Create/update a single secret (encrypted at rest)' })
  async updateSecret(
    @CurrentUser('sub') userId: string,
    @Param('key') key: string,
    @Body() dto: UpdateSecretDto,
  ) {
    return this.secrets.updateSecret(userId, key, dto.value);
  }

  @Post('secrets/:key/reveal')
  @UseGuards(VaultGuard)
  @ApiOperation({ summary: 'Reveal a secret value once (requires fresh TOTP)' })
  async revealSecret(
    @CurrentUser('sub') userId: string,
    @Param('key') key: string,
    @Body() dto: RevealSecretDto,
  ) {
    await this.vault.assertFreshTotp(userId, dto.totp);
    return this.secrets.revealSecret(userId, key);
  }

  @Post('secrets/:key/test')
  @UseGuards(VaultGuard)
  @ApiOperation({ summary: 'Validate a stored secret (format check)' })
  async testSecret(@CurrentUser('sub') userId: string, @Param('key') key: string) {
    return this.secrets.testSecret(userId, key);
  }
}
