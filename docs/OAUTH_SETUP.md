# OAuth 설정 가이드

## 1. 환경 설정

### 필수 환경변수
`.env` 파일에 다음 환경변수를 설정하세요:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

**NEXTAUTH_SECRET 생성 방법:**
```bash
openssl rand -base64 32
```

## 2. OAuth 제공자별 설정

### Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "APIs & Services" > "Credentials" 이동
4. "Create Credentials" > "OAuth client ID" 선택
5. Application type: "Web application" 선택
6. 설정:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Client ID와 Client Secret 복사
8. `/admin/general`에서 Google OAuth 활성화 및 정보 입력

### GitHub OAuth

1. GitHub Settings > Developer settings > OAuth Apps
2. "New OAuth App" 클릭
3. 설정:
   - Application name: Your app name
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Client ID와 Client Secret 복사
5. `/admin/general`에서 GitHub OAuth 활성화 및 정보 입력

### Microsoft (Azure AD) OAuth

1. [Azure Portal](https://portal.azure.com/)에 접속
2. "Azure Active Directory" > "App registrations" > "New registration"
3. 설정:
   - Name: Your app name
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Web - `http://localhost:3000/api/auth/callback/azure-ad`
4. Application (client) ID 복사
5. "Certificates & secrets" > "New client secret" 생성
6. Secret value 복사
7. `/admin/general`에서 Microsoft OAuth 활성화 및 정보 입력

### Kakao OAuth

1. [Kakao Developers](https://developers.kakao.com/)에 접속
2. "내 애플리케이션" > "애플리케이션 추가하기"
3. 앱 생성 후 "앱 설정" > "플랫폼" > "Web 플랫폼 등록"
   - 사이트 도메인: `http://localhost:3000`
4. "카카오 로그인" 활성화
5. Redirect URI 등록: `http://localhost:3000/api/auth/callback/kakao`
6. "앱 키"에서 REST API 키 복사 (Client ID로 사용)
7. "카카오 로그인" > "보안"에서 Client Secret 생성 및 복사
8. `/admin/general`에서 Kakao OAuth 활성화 및 정보 입력

### Naver OAuth

1. [Naver Developers](https://developers.naver.com/)에 접속
2. "Application" > "애플리케이션 등록"
3. 설정:
   - 애플리케이션 이름: Your app name
   - 사용 API: "네이버 로그인"
   - 서비스 URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/callback/naver`
4. Client ID와 Client Secret 복사
5. `/admin/general`에서 Naver OAuth 활성화 및 정보 입력

## 3. 프로덕션 설정

프로덕션 환경에서는 모든 URL을 실제 도메인으로 변경하세요:
- `http://localhost:3000` → `https://yourdomain.com`

## 4. 문제 해결

### OAuth 로그인이 작동하지 않을 때

1. **환경변수 확인**
   - `NEXTAUTH_URL`이 올바르게 설정되어 있는지 확인
   - `NEXTAUTH_SECRET`이 설정되어 있는지 확인

2. **Callback URL 확인**
   - OAuth 제공자에 등록한 callback URL이 정확한지 확인
   - URL 끝에 슬래시(/)가 없어야 함

3. **Client ID/Secret 확인**
   - 복사한 값에 공백이 포함되지 않았는지 확인
   - Secret이 만료되지 않았는지 확인

4. **연결 테스트**
   - `/admin/general`에서 "연결 테스트" 버튼으로 설정 검증

## 5. 보안 주의사항

- Client Secret은 절대 클라이언트 코드에 노출하지 마세요
- 프로덕션 환경에서는 HTTPS를 반드시 사용하세요
- `NEXTAUTH_SECRET`은 안전하게 관리하고 정기적으로 변경하세요
