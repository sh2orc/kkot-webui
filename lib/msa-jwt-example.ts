/**
 * MSA 환경에서 JWT 인증 사용 예제
 * 
 * 이 파일은 다른 MSA 서비스에서 JWT 인증을 구현할 때 참고용으로 사용하세요.
 * NextAuth JWT와 호환되면서도 독립적으로 사용 가능합니다.
 */

import { JWTAuth } from './jwt-auth'

// ============================================================================
// 1. Express.js 서버에서 사용하는 예제
// ============================================================================

export const expressJWTMiddleware = () => {
  return async (req: any, res: any, next: any) => {
    try {
      // Authorization 헤더에서 토큰 추출
      const authHeader = req.headers.authorization
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

      if (!token) {
        return res.status(401).json({ error: 'Token not provided' })
      }

      // JWT 검증
      const result = await JWTAuth.authenticateToken(token)
      
      if (!result.success) {
        return res.status(401).json({ error: result.error })
      }

      // 사용자 정보를 req 객체에 추가
      req.user = result.user
      next()
    } catch (error) {
      console.error('JWT verification error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// ============================================================================
// 2. FastAPI (Python) 서버에서 사용할 수 있는 JWT 검증 로직 (의사코드)
// ============================================================================

/*
Python FastAPI 예제:

import jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

JWT_SECRET = "your-nextauth-secret"  # 동일한 시크릿 사용
JWT_ALGORITHM = "HS256"

async def verify_jwt_token(token: str = Depends(security)):
    try:
        # NextAuth JWT 토큰 디코딩
        payload = jwt.decode(token.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # 필수 필드 확인
        if not payload.get('id') or not payload.get('email') or not payload.get('role'):
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
        return {
            'id': payload['id'],
            'email': payload['email'],
            'name': payload['name'],
            'role': payload['role']
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# 사용 예제
@app.get("/protected")
async def protected_route(user = Depends(verify_jwt_token)):
    return {"message": f"Hello {user['email']}!", "role": user['role']}
*/

// ============================================================================
// 3. Go 서버에서 사용할 수 있는 JWT 검증 로직 (의사코드)
// ============================================================================

/*
Go Gin 예제:

package main

import (
    "github.com/golang-jwt/jwt/v5"
    "github.com/gin-gonic/gin"
)

type Claims struct {
    ID    string `json:"id"`
    Email string `json:"email"`
    Name  string `json:"name"`
    Role  string `json:"role"`
    jwt.RegisteredClaims
}

func JWTAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(401, gin.H{"error": "Token not provided"})
            c.Abort()
            return
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        
        claims := &Claims{}
        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            return []byte("your-nextauth-secret"), nil  // 동일한 시크릿 사용
        })

        if err != nil || !token.Valid {
            c.JSON(401, gin.H{"error": "Invalid token"})
            c.Abort()
            return
        }

        // 사용자 정보를 컨텍스트에 추가
        c.Set("user", claims)
        c.Next()
    }
}

// 사용 예제
func protectedHandler(c *gin.Context) {
    user, _ := c.Get("user")
    claims := user.(*Claims)
    c.JSON(200, gin.H{
        "message": "Hello " + claims.Email,
        "role": claims.Role,
    })
}
*/

// ============================================================================
// 4. Next.js API Route에서 사용하는 예제
// ============================================================================

export const withJWTAuth = (handler: any) => {
  return async (req: any, res: any) => {
    try {
      // Authorization 헤더 또는 쿠키에서 토큰 추출
      let token = req.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        // 쿠키에서 추출 시도
        token = req.cookies['next-auth.session-token'] || req.cookies['__Secure-next-auth.session-token']
      }

      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const user = await JWTAuth.verify(token)
      if (!user) {
        return res.status(401).json({ error: 'Invalid token' })
      }

      // 사용자 정보를 req 객체에 추가
      req.user = user
      return handler(req, res)
    } catch (error) {
      console.error('JWT Auth error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// ============================================================================
// 5. 클라이언트에서 JWT 토큰 사용 예제
// ============================================================================

export class MSAJWTClient {
  private token: string | null = null

  // 토큰 설정 (로그인 후 호출)
  setToken(token: string) {
    this.token = token
    // localStorage에 저장 (옵션)
    if (typeof window !== 'undefined') {
      localStorage.setItem('jwt-token', token)
    }
  }

  // 저장된 토큰 불러오기
  loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('jwt-token')
    }
    return this.token
  }

  // 토큰 제거
  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jwt-token')
    }
  }

  // API 호출 시 토큰을 헤더에 추가
  async apiCall(url: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      // 토큰 만료 시 클리어
      this.clearToken()
      throw new Error('Authentication expired')
    }

    return response
  }
}

// ============================================================================
// 6. 환경 설정 가이드
// ============================================================================

export const MSA_JWT_SETUP_GUIDE = {
  environment: {
    // 모든 MSA 서비스에서 동일한 시크릿 사용
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    
    // JWT 설정
    JWT_EXPIRES_IN: '30d',
    JWT_ALGORITHM: 'HS256',
  },
  
  deployment: {
    // Docker 환경에서 환경변수 공유
    docker_compose: `
services:
  web-ui:
    environment:
      - NEXTAUTH_SECRET=your-shared-secret
  
  api-service:
    environment:
      - JWT_SECRET=your-shared-secret  # 동일한 값
  
  python-service:
    environment:
      - JWT_SECRET=your-shared-secret  # 동일한 값
`,
    
    kubernetes: `
apiVersion: v1
kind: Secret
metadata:
  name: jwt-secret
data:
  secret: <base64-encoded-secret>
---
# 모든 서비스에서 동일한 시크릿 참조
spec:
  containers:
  - name: app
    env:
    - name: JWT_SECRET
      valueFrom:
        secretKeyRef:
          name: jwt-secret
          key: secret
`,
  },
  
  testing: {
    // JWT 토큰 테스트
    example: `
// 토큰 생성 테스트
const token = await JWTAuth.create({
  id: 'user123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user'
})

// 토큰 검증 테스트
const user = await JWTAuth.verify(token)
console.log(user) // { id: 'user123', email: 'test@example.com', ... }
`,
  }
}
