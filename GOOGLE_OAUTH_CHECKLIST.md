# Google OAuth 설정 체크리스트

## 1. Google Cloud Console 설정 확인
https://console.cloud.google.com/

### ✅ OAuth 2.0 Client ID 설정
- **Application type**: Web application
- **Authorized JavaScript origins**:
  - `http://localhost:3000`
  
- **Authorized redirect URIs** (매우 중요!):
  - `http://localhost:3000/api/auth/callback/google`
  - **주의**: 끝에 슬래시(/)가 없어야 함
  - **주의**: https가 아닌 http여야 함 (로컬 개발)

### ✅ OAuth consent screen
- **Publishing status**: Testing 또는 Production
- **Test users** (Testing 상태일 경우):
  - 본인의 Google 이메일 추가

## 2. 현재 설정된 값
- Client ID: 142450213226-mqloh60l5f1cb400b7tqcpm13v8rcbg8.apps.googleusercontent.com
- Client Secret: ***설정됨***
- Enabled: true

## 3. 디버깅 방법
1. 브라우저 개발자 도구 Network 탭 열기
2. Google 로그인 버튼 클릭
3. 리다이렉트되는 URL들 확인
4. 특히 `error` 파라미터 확인

## 4. 일반적인 문제와 해결방법
- **error=redirect_uri_mismatch**: 콜백 URL이 Google Console과 일치하지 않음
- **error=access_denied**: OAuth consent screen 설정 문제 또는 test user 미등록
- **error=invalid_client**: Client ID/Secret 불일치
