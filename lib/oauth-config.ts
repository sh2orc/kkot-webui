// OAuth configuration loader
import { getDb } from '@/lib/db/server';
import { systemSettings } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

export interface OAuthConfig {
  google?: {
    clientId: string;
    clientSecret: string;
  };
}

let cachedConfig: OAuthConfig | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function loadOAuthConfig(): Promise<OAuthConfig> {
  const now = Date.now();
  if (cachedConfig && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedConfig;
  }

  try {
    const db = await getDb();
    const settings = await db.select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, [
        'auth.oauth.google.enabled',
        'auth.oauth.google.clientId',
        'auth.oauth.google.clientSecret',
      ]));
    
    const config: OAuthConfig = {};
    
    const googleEnabled = settings.find(s => s.key === 'auth.oauth.google.enabled')?.value === 'true';
    const googleClientId = settings.find(s => s.key === 'auth.oauth.google.clientId')?.value;
    const googleClientSecret = settings.find(s => s.key === 'auth.oauth.google.clientSecret')?.value;
    
    if (googleEnabled && googleClientId && googleClientSecret) {
      config.google = {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      };
    }
    
    cachedConfig = config;
    lastFetchTime = now;
    console.log('OAuth config loaded:', { hasGoogle: !!config.google });
    
    return config;
  } catch (error) {
    console.error('Error loading OAuth config:', error);
    return cachedConfig || {};
  }
}

// Initialize on module load
loadOAuthConfig().catch(console.error);