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
  status?: string // DB에서 확인한 사용자 상태
}

// MSA 공통 JWT 설정
export const JWT_CONFIG = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  maxAge: 30 * 24 * 60 * 60, // 30일 (기본값)
  algorithm: 'HS256' as const,
}

/**
 * DB에서 JWT 만료시간 설정을 가져오는 함수
 */
export async function getJWTMaxAge(): Promise<number> {
  try {
    // 서버 환경에서만 DB 접근
    if (typeof window !== 'undefined') {
      return JWT_CONFIG.maxAge
    }

    const { adminSettingsRepository } = await import('@/lib/db/repository')
    const jwtExpirySettings = await adminSettingsRepository.findByKey('auth.jwtExpiry')
    
    if (jwtExpirySettings && jwtExpirySettings.length > 0) {
      const expiryValue = parseInt(jwtExpirySettings[0].value)
      
      // -1은 무제한 (매우 긴 시간으로 설정)
      if (expiryValue === -1) {
        return 365 * 24 * 60 * 60 // 1년
      }
      
      // 양수 값이면 그대로 사용
      if (expiryValue > 0) {
        return expiryValue
      }
    }
  } catch (error) {
    console.warn('[JWT] Failed to load JWT expiry from DB, using default:', error)
  }
  
  // 기본값 반환
  return JWT_CONFIG.maxAge
}

/**
 * NextAuth JWT 토큰 생성 (DB 설정 사용)
 */
export async function createJWTToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const maxAge = await getJWTMaxAge()
  
  return await encode({
    token: {
      ...payload,
      sub: payload.id, // NextAuth 호환성을 위해 sub 추가
    },
    secret: JWT_CONFIG.secret,
    maxAge: maxAge,
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
    if (decoded.exp && typeof decoded.exp === 'number' && decoded.exp < Math.floor(Date.now() / 1000)) {
      console.log('[JWT] Token expired')
      return null
    }

    return {
      id: decoded.id as string,
      email: decoded.email as string,
      name: decoded.name as string,
      role: decoded.role as string,
      iat: (typeof decoded.iat === 'number') ? decoded.iat : undefined,
      exp: (typeof decoded.exp === 'number') ? decoded.exp : undefined,
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
  if (!payload) {
    console.log('[JWT] Authentication failed')
    return null
  }

  // DB에서 사용자 유효성 확인 (서버 환경에서만)
  if (typeof window === 'undefined') {
    try {
      const { userRepository } = await import('@/lib/db/repository')
      const user = await userRepository.findById(payload.id)
      
      if (!user) {
        console.log('[JWT] User not found in DB:', payload.email)
        return null
      }

      // 사용자 상태 추가
      payload.status = user.status

      if (user.status !== 'active') {
        console.log('[JWT] User account is not active:', payload.email, 'Status:', user.status)
        // pending 상태는 payload를 반환하여 특별 처리
        if (user.status === 'pending') {
          return payload
        }
        // inactive, suspended 등은 null 반환
        return null
      }

      // 토큰의 권한과 DB의 권한이 일치하는지 확인
      if (user.role !== payload.role) {
        console.log('[JWT] Role mismatch - Token:', payload.role, 'DB:', user.role)
        // DB의 권한을 우선시
        payload.role = user.role
      }

      console.log('[JWT] Authentication successful for user:', payload.email)
    } catch (error) {
      console.error('[JWT] DB check failed:', error)
      // DB 체크 실패시에도 일단 통과 (DB 연결 문제 등)
    }
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
   * 토큰 생성 (DB 설정 사용)
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
