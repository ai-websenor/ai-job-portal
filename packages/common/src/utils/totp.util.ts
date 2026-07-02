/**
 * Minimal RFC 6238 TOTP (time-based one-time password) implemented with Node crypto.
 * No external dependency (avoids pulling otplib/qrcode into services). SHA-1, 30s step, 6 digits —
 * the defaults every authenticator app (Google Authenticator, Authy, 1Password) expects.
 *
 * The backend returns the `otpauth://` URI from `totpAuthUri()`; the frontend renders the QR.
 */
import { createHmac, randomBytes } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error('Invalid base32 character in TOTP secret');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

/** Generate a new base32 TOTP secret (160 bits, the RFC-recommended length). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * Verify a 6-digit token against a base32 secret. `window` allows +/- N 30s steps for clock drift
 * (default 1 = accepts the previous, current, and next code).
 */
export function verifyTotp(token: string, secretBase32: string, window = 1): boolean {
  if (!/^\d{6}$/.test(token || '')) {
    return false;
  }
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (let error = -window; error <= window; error++) {
    if (hotp(secret, counter + error) === token) {
      return true;
    }
  }
  return false;
}

/** Build the otpauth:// provisioning URI for QR rendering on the client. */
export function totpAuthUri(account: string, issuer: string, secretBase32: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
