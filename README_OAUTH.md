# OAuth 설정 가이드

## 1. 환경변수 설정

`.env` 파일 생성:

```bash
# 필수 설정
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# OAuth 설정 (선택사항 - DB 설정이 우선됨)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

**NEXTAUTH_SECRET 생성:**
```bash
openssl rand -base64 32
```

## 2. OAuth 설정 방법

### 방법 1: 관리자 페이지에서 설정 (권장)
1. `/admin/general` 페이지 접속
2. OAuth 제공자 활성화
3. Client ID와 Client Secret 입력
4. 연결 테스트
5. 저장

### 방법 2: 환경변수로 설정
1. `.env` 파일에 OAuth 정보 추가
2. 서버 재시작

## 3. OAuth 제공자별 설정

### Google OAuth
1. https://console.cloud.google.com/ 접속
2. OAuth 2.0 Client ID 생성
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

### GitHub OAuth
1. GitHub Settings > Developer settings > OAuth Apps
2. New OAuth App 생성
3. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`

## 4. 문제 해결

### 서버 재시작
```bash
# 기존 서버 종료 (Ctrl + C)
# 서버 재시작
npm run dev
```

### 환경변수 확인
```bash
echo $NEXTAUTH_URL
echo $NEXTAUTH_SECRET
```

### DB 초기화 (필요시)
```bash
npx tsx scripts/setup-oauth.ts
```

## 5. 테스트
1. `/auth` 페이지에서 OAuth 버튼 확인
2. OAuth 로그인 시도
3. 성공 시 `/chat`로 리다이렉트
