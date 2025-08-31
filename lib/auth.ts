import { getServerSession as nextAuthGetServerSession } from 'next-auth/next'
import type { NextAuthOptions } from 'next-auth'
import crypto from 'crypto'

// 비밀번호 해싱 및 검증 함수
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedPassword: string): boolean {
  const [salt, storedHash] = storedPassword.split(':')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return hash === storedHash
}

export function generateUserId(): string {
  return crypto.randomBytes(16).toString('hex')
}

// getServerSession을 위한 기본 authOptions
// 실제 OAuth 프로바이더는 런타임에 동적으로 로드됨
export const baseAuthOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  providers: [], // 런타임에 동적으로 설정
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/auth',
    signOut: '/auth',
    error: '/auth',
  },
}

export async function getServerSession() {
  // 동적으로 authOptions를 가져와야 하므로 직접 next-auth를 호출
  // 이는 NextAuth 핸들러가 처리하도록 함
  return nextAuthGetServerSession()
}