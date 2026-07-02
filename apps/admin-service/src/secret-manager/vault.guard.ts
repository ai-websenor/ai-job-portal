import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { VaultService } from './vault.service';

/**
 * Requires a valid, live vault session (separate from the long-lived admin JWT).
 * The vault token is sent in the `X-Vault-Token` header (forwarded by the gateway) and must:
 *  - have a valid signature + `secret-manager` scope,
 *  - belong to the currently authenticated admin (token.sub === req.user.sub),
 *  - still exist in Redis (hard 20-minute expiry / revocable on lock).
 *
 * Apply AFTER AuthGuard('jwt') so `req.user` is populated.
 */
@Injectable()
export class VaultGuard implements CanActivate {
  constructor(private readonly vaultService: VaultService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.sub;
    const token = req.headers['x-vault-token'] as string | undefined;

    if (!userId) {
      throw new ForbiddenException('Not authenticated');
    }
    if (!token) {
      throw new ForbiddenException('Vault is locked. Unlock the Secret Manager to continue.');
    }
    const ok = await this.vaultService.verifyVaultToken(token, userId);
    if (!ok) {
      throw new ForbiddenException('Vault session invalid or expired. Please unlock again.');
    }
    return true;
  }
}
