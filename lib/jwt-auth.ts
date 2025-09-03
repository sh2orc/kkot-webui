import { decode, encode } from 'next-auth/jwt'
import { NextRequest } from 'next/server'

// JWT 토큰 구조 정의
export interface JWTPayload {
  id: string
  email: string
  name: string
  role: string
  iat?: number
  exp?: number
  sub?: string
}

// MSA 공통 JWT 설정
export const JWT_CONFIG = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  maxAge: 30 * 24 * 60 * 60, // 30일
  algorithm: 'HS256' as const,
}

/**
 * NextAuth JWT 토큰 생성 (기존 방식 유지)
 */
export async function createJWTToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return await encode({
    token: {
      ...payload,
      sub: payload.id, // NextAuth 호환성을 위해 sub 추가
    },
    secret: JWT_CONFIG.secret,
    maxAge: JWT_CONFIG.maxAge,
  })
}

/**
 * MSA 환경에서 사용할 수 있는 순수 JWT 검증 함수
 * NextAuth의 decode를 사용하지만, NextAuth 세션에 의존하지 않음
 */
export async function verifyJWTToken(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = await decode({
      token,
      secret: JWT_CONFIG.secret,
    })

    if (!decoded) {
      console.log('[JWT] Token decode failed')
      return null
    }

    // 필수 필드 확인
    if (!decoded.id || !decoded.email || !decoded.role) {
      console.log('[JWT] Missing required fields in token')
      return null
    }

    // 만료 시간 확인
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      console.log('[JWT] Token expired')
      return null
    }

    return {
      id: decoded.id as string,
      email: decoded.email as string,
      name: decoded.name as string,
      role: decoded.role as string,
      iat: decoded.iat as number,
      exp: decoded.exp as number,
    }
  } catch (error) {
    console.error('[JWT] Token verification failed:', error)
    return null
  }
}

/**
 * Request에서 JWT 토큰 추출 (쿠키 또는 Authorization 헤더)
 */
export function extractTokenFromRequest(request: NextRequest): string | null {
  // 1. 쿠키에서 추출 (브라우저용)
  const isLocalhost = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1'
  const cookieName = process.env.NODE_ENV === 'production' && !isLocalhost 
    ? '__Secure-next-auth.session-token' 
    : 'next-auth.session-token'
  
  const cookieToken = request.cookies.get(cookieName)?.value
  if (cookieToken) {
    return cookieToken
  }

  // 2. Authorization 헤더에서 추출 (API 호출용)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

/**
 * MSA 환경에서 사용할 인증 검증 함수
 * NextAuth에 의존하지 않고 순수 JWT 검증만 수행
 */
export async function authenticateRequest(request: NextRequest): Promise<JWTPayload | null> {
  console.log('[JWT] Authenticating request for path:', request.nextUrl.pathname)
  
  const token = extractTokenFromRequest(request)
  if (!token) {
    console.log('[JWT] No token found in request')
    return null
  }

  const payload = await verifyJWTToken(token)
  if (payload) {
    console.log('[JWT] Authentication successful for user:', payload.email)
  } else {
    console.log('[JWT] Authentication failed')
  }

  return payload
}

/**
 * 토큰 갱신 함수 (필요시 사용)
 */
export async function refreshToken(currentToken: string): Promise<string | null> {
  const payload = await verifyJWTToken(currentToken)
  if (!payload) {
    return null
  }

  // 새 토큰 생성
  return await createJWTToken({
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
}

/**
 * MSA 서비스에서 사용할 수 있는 간단한 인증 헬퍼
 */
export class JWTAuth {
  /**
   * 토큰 검증
   */
  static async verify(token: string): Promise<JWTPayload | null> {
    return await verifyJWTToken(token)
  }

  /**
   * 토큰 생성
   */
  static async create(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    return await createJWTToken(payload)
  }

  /**
   * Express/다른 프레임워크에서 사용할 수 있는 미들웨어 형태
   */
  static async authenticateToken(tokenString: string): Promise<{
    success: boolean
    user?: JWTPayload
    error?: string
  }> {
    try {
      const user = await verifyJWTToken(tokenString)
      if (user) {
        return { success: true, user }
      } else {
        return { success: false, error: 'Invalid token' }
      }
    } catch (error) {
      return { success: false, error: 'Token verification failed' }
    }
  }
}
