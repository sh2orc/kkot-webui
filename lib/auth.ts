import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

// Password hashing
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Password verification
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const hashVerify = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashVerify;
}

// User ID generation
export function generateUserId(): string {
  return createHash('sha256').update(randomBytes(16)).digest('hex').substring(0, 16);
}