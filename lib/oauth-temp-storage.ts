// OAuth 임시 데이터 저장소
// 실제 환경에서는 Redis 등을 사용해야 합니다

interface OAuthData {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: string;
}

const tempOAuthData = new Map<string, OAuthData>();

export function storeOAuthData(data: OAuthData): string {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  tempOAuthData.set(token, data);
  
  console.log('🚀 OAuth data stored with token:', token);
  
  // 10분 후 자동 삭제
  setTimeout(() => {
    tempOAuthData.delete(token);
    console.log('🚀 OAuth token expired and deleted:', token);
  }, 10 * 60 * 1000);
  
  return token;
}

export function getOAuthData(token: string): OAuthData | null {
  const data = tempOAuthData.get(token);
  console.log('🚀 OAuth data retrieved for token:', token, data ? 'found' : 'not found');
  return data || null;
}

export function deleteOAuthData(token: string): void {
  tempOAuthData.delete(token);
  console.log('🚀 OAuth data deleted for token:', token);
}
