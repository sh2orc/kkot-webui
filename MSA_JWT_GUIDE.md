# MSA 환경을 위한 JWT 인증 시스템

## 🎯 문제 해결

기존 NextAuth 세션 관리가 MSA 환경에서 발생할 수 있는 문제를 해결했습니다:

- ❌ **기존**: NextAuth 세션에 의존하여 MSA 인스턴스 간 상태 불일치 가능
- ✅ **개선**: NextAuth JWT를 유지하되 순수 JWT 검증으로 MSA 호환성 확보

## 🔧 주요 변경사항

### 1. MSA 호환 JWT 유틸리티 생성 (`lib/jwt-auth.ts`)

```typescript
import { JWTAuth } from '@/lib/jwt-auth'

// 토큰 생성 (NextAuth 호환, DB 설정 자동 적용)
const token = await JWTAuth.create({
  id: 'user123',
  email: 'user@example.com',
  name: 'User Name',
  role: 'user'
})

// 토큰 검증 (MSA 환경에서 독립적)
const user = await JWTAuth.verify(token)
```

### 2. 컴팩트한 JWT 만료시간 설정 UI (`components/ui/jwt-expiry-selector.tsx`)

**🎯 기존 문제**: 초 단위 숫자 입력만 가능 + UI가 너무 큼
**✅ 개선**: 컴팩트한 탭 UI + 작은 버튼들 + 간결한 표시

- **탭 방식**: 라디오 버튼 대신 깔끔한 탭 사용
- **컴팩트 버튼**: 4×2 그리드로 일반 선택지 표시
- **간결한 표시**: 현재 설정만 하단에 간단히 표시
- **작은 사이즈**: 전체 높이를 크게 줄여 공간 절약

### 3. 미들웨어 개선 (`middleware.ts`)

```typescript
// 변경 전: NextAuth 세션 의존
const token = await getToken({ req: request })

// 변경 후: 순수 JWT 검증
const user = await authenticateRequest(request)
```

### 4. 토큰 생성 API 통합

- `custom-login` API 업데이트
- `google callback` API 업데이트
- 동일한 JWT 설정으로 토큰 생성 표준화

## 🌐 MSA 환경에서 사용법

### Express.js 서버

```typescript
import { JWTAuth } from './jwt-auth'

app.use('/api', async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const result = await JWTAuth.authenticateToken(token)
  
  if (result.success) {
    req.user = result.user
    next()
  } else {
    res.status(401).json({ error: 'Unauthorized' })
  }
})
```

### Python FastAPI

```python
import jwt

JWT_SECRET = "your-nextauth-secret"  # 동일한 시크릿

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
```

### Go Gin

```go
func JWTAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        // JWT 검증 로직
        claims, err := jwt.ParseWithClaims(token, &Claims{}, func(token *jwt.Token) (interface{}, error) {
            return []byte("your-nextauth-secret"), nil
        })
        // ...
    }
}
```

## 🔑 핵심 장점

### 1. NextAuth 호환성 유지
- 기존 NextAuth JWT 토큰 생성 방식 그대로 사용
- 프론트엔드 코드 변경 없음
- OAuth 로그인 플로우 그대로 유지

### 2. MSA 독립성 확보
- 각 서비스가 NextAuth에 의존하지 않고 JWT 검증 가능
- 동일한 시크릿으로 모든 MSA 인스턴스에서 토큰 검증
- 서비스 간 상태 공유 불필요

### 3. 확장성
- 새로운 MSA 서비스 추가 시 JWT 검증 로직만 구현
- 다양한 프로그래밍 언어/프레임워크에서 사용 가능
- 표준 JWT 방식으로 써드파티 도구 호환

## 🛠 환경 설정

### Docker Compose

```yaml
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
```

### Kubernetes

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: jwt-secret
data:
  secret: <base64-encoded-secret>
---
# 모든 서비스에서 동일한 시크릿 참조
```

## 🧪 테스트

```typescript
// 토큰 생성 테스트
const token = await JWTAuth.create({
  id: 'test-user',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin'
})

// 토큰 검증 테스트
const user = await JWTAuth.verify(token)
console.log(user) // { id: 'test-user', email: 'test@example.com', role: 'admin' }
```

## 📁 파일 구조

```
lib/
├── jwt-auth.ts           # MSA 호환 JWT 유틸리티
├── msa-jwt-example.ts    # 다양한 언어/프레임워크 예제
└── auth.ts              # 기존 NextAuth 설정 (유지)

middleware.ts             # 순수 JWT 검증으로 업데이트
app/api/auth/
├── custom-login/        # 새 JWT 유틸리티 사용
└── callback/google/     # 새 JWT 유틸리티 사용
```

## ✅ 완료된 작업

- [x] MSA 호환 JWT 유틸리티 생성
- [x] 미들웨어를 순수 JWT 검증으로 변경  
- [x] 기존 토큰 생성 API들 업데이트
- [x] **컴팩트한 JWT 만료시간 설정 UI 구현**
- [x] **DB 설정값과 JWT 유틸리티 연동**
- [x] 다양한 언어/프레임워크 예제 제공
- [x] 환경 설정 가이드 작성
- [x] **다국어 지원 (한국어/영어)**

## 🎨 새로운 UI 기능

### JWT 만료시간 설정 (Admin > General)

![JWT 설정 UI 개선](./jwt-ui-preview.png)

**기존**: 초 단위 숫자만 입력 + 큰 UI → **개선**: 컴팩트한 탭 + 작은 버튼들

이제 MSA 환경에서도 안전하고 일관된 JWT 인증이 가능하며, 관리자가 쉽게 설정할 수 있습니다! 🎉
