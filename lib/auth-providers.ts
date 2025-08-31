import GoogleProvider from 'next-auth/providers/google';
import { getDb } from '@/lib/db/server';
import { systemSettings } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

// DB에서 OAuth 설정을 가져오는 함수
export async function getOAuthProviders() {
  try {
    const db = await getDb();
    const settings = await db.select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, [
        'auth.oauth.google.enabled',
        'auth.oauth.google.clientId',
        'auth.oauth.google.clientSecret',
      ]));
    
    const oauthSettings: any = {};
    settings.forEach(setting => {
      oauthSettings[setting.key] = setting.value;
    });
    
    const providers = [];
    
    // Google OAuth 추가
    if (oauthSettings['auth.oauth.google.enabled'] === 'true' &&
        oauthSettings['auth.oauth.google.clientId'] &&
        oauthSettings['auth.oauth.google.clientSecret']) {
      providers.push(
        GoogleProvider({
          clientId: oauthSettings['auth.oauth.google.clientId'],
          clientSecret: oauthSettings['auth.oauth.google.clientSecret'],
          authorization: {
            params: {
              prompt: "consent",
              access_type: "offline",
              response_type: "code"
            }
          }
        })
      );
    }
    
    return providers;
  } catch (error) {
    console.error('Error fetching OAuth providers:', error);
    return [];
  }
}
