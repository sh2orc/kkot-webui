import { getServerSession as nextAuthGetServerSession } from 'next-auth/next'
import type { NextAuthOptions } from 'next-auth'
import crypto from 'crypto'

// Password hashing and verification functions
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

// Base authOptions for getServerSession
// Actual OAuth providers are dynamically loaded at runtime
export const baseAuthOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  providers: [], // Dynamically configured at runtime
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
  // Get basic session using baseAuthOptions
  // Actual OAuth configuration is handled at runtime
  return nextAuthGetServerSession(baseAuthOptions)
}