import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

// 비밀번호 해싱
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// 비밀번호 검증
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const hashVerify = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === hashVerify;
}

// 사용자 ID 생성
export function generateUserId(): string {
  return createHash('sha256').update(randomBytes(16)).digest('hex').substring(0, 16);
}