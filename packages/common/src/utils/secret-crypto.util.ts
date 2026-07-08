/**
 * App-level envelope encryption for managed secrets (Tier-2 integration credentials).
 *
 * - AES-256-GCM with a random 12-byte IV per value (authenticated encryption).
 * - The KEK is derived once via scrypt from `SECRETS_MASTER_KEY` (deploy env, NEVER stored in DB).
 * - Ciphertext is packed into a single string: `v1.<ivB64>.<tagB64>.<ctB64>` so a secret needs
 *   only one text column. The `v1` prefix lets us rotate the algorithm/key later.
 *
 * This is reversible by design — Tier-2 secrets (Stripe, Twilio, OAuth, ...) must be replayed to
 * their third-party APIs, so they are ENCRYPTED, not hashed. Passphrases are hashed elsewhere
 * (bcrypt) because they are only ever compared. Do NOT use `hash.util.ts` (bare SHA-256) for secrets.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_VERSION = 'v1';
const IV_BYTES = 12;
// Static, non-secret context string for key derivation. The actual secret is SECRETS_MASTER_KEY.
const KDF_SALT = 'ai-job-portal:secret-manager:kek:v1';

let cachedKey: Buffer | null = null;

// Non-production fallback so local/staging works without a provisioned master key.
// Deterministic (fixed) so values encrypted in one run still decrypt after a restart.
// NEVER used in production — getKey() throws there when SECRETS_MASTER_KEY is missing/weak.
const DEV_FALLBACK_MASTER_KEY = 'ai-job-portal:dev-secrets-master-key:not-for-production';

function getKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }
  const master = process.env.SECRETS_MASTER_KEY;
  if (!master || master.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SECRETS_MASTER_KEY is not set or too weak. Provide a strong (>=32 byte, base64) value in the deploy environment.',
      );
    }
    // development / staging / test: fall back to a fixed dev key.
    cachedKey = scryptSync(DEV_FALLBACK_MASTER_KEY, KDF_SALT, 32);
    return cachedKey;
  }
  cachedKey = scryptSync(master, KDF_SALT, 32);
  return cachedKey;
}

export interface EncryptedSecret {
  /** Packed ciphertext: `v1.<ivB64>.<tagB64>.<ctB64>` */
  packed: string;
  /** Last 4 chars of the plaintext, for masked display. Empty when value is shorter than 4. */
  lastFour: string;
}

/** Encrypt a plaintext secret value. Throws if SECRETS_MASTER_KEY is missing/weak. */
export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = [
    KEY_VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
  const lastFour = plaintext.length >= 4 ? plaintext.slice(-4) : '';
  return { packed, lastFour };
}

/** Decrypt a packed secret. Throws if the value was tampered with (GCM auth tag mismatch). */
export function decryptSecret(packed: string): string {
  const key = getKey();
  const parts = packed.split('.');
  if (parts.length !== 4 || parts[0] !== KEY_VERSION) {
    throw new Error('Invalid encrypted secret format');
  }
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const ciphertext = Buffer.from(parts[3], 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  // .final() throws if the auth tag does not verify — fail closed.
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/** Build a masked representation for display, e.g. `••••cdef`. Never returns the full value. */
export function maskValue(lastFour?: string | null): string {
  return lastFour ? `••••${lastFour}` : '••••';
}
