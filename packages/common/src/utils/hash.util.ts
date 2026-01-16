import { createHash, randomBytes } from 'crypto';

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const passwordSalt = salt || randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(password + passwordSalt)
    .digest('hex');

  return { hash, salt: passwordSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashPassword(password, salt);
  return computedHash === hash;
}

export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateOtp(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  const randomBytesArray = randomBytes(length);

  for (let i = 0; i < length; i++) {
    otp += digits[randomBytesArray[i] % 10];
  }

  return otp;
}
