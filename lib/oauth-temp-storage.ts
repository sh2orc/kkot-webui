// OAuth temporary data storage
// In production environments, Redis etc. should be used

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
  
  // Auto-delete after 10 minutes
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
