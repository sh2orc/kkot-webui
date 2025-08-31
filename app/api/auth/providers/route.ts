import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/server'
import { systemSettings } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'

export async function GET() {
  try {
    const providers = [];
    const db = await getDb();
    
    // Google OAuth 설정 DB에서 확인
    const googleSettings = await db.select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, [
        'auth.oauth.google.enabled',
        'auth.oauth.google.clientId',
        'auth.oauth.google.clientSecret'
      ]));
    
    const googleEnabled = googleSettings.find(s => s.key === 'auth.oauth.google.enabled')?.value === 'true';
    const googleClientId = googleSettings.find(s => s.key === 'auth.oauth.google.clientId')?.value;
    const googleClientSecret = googleSettings.find(s => s.key === 'auth.oauth.google.clientSecret')?.value;
    
    console.log('Google OAuth settings from DB:', {
      enabled: googleEnabled,
      hasClientId: !!googleClientId,
      hasClientSecret: !!googleClientSecret
    });
    
    if (googleEnabled && googleClientId && googleClientSecret) {
      providers.push({
        id: 'google',
        name: 'Google',
        type: 'oauth',
        signinUrl: '/api/auth/signin/google',
        callbackUrl: '/api/auth/callback/google'
      });
    }
    
    // GitHub OAuth 설정 DB에서 확인
    const githubSettings = await db.select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, [
        'auth.oauth.github.enabled',
        'auth.oauth.github.clientId',
        'auth.oauth.github.clientSecret'
      ]));
    
    const githubEnabled = githubSettings.find(s => s.key === 'auth.oauth.github.enabled')?.value === 'true';
    const githubClientId = githubSettings.find(s => s.key === 'auth.oauth.github.clientId')?.value;
    const githubClientSecret = githubSettings.find(s => s.key === 'auth.oauth.github.clientSecret')?.value;
    
    if (githubEnabled && githubClientId && githubClientSecret) {
      providers.push({
        id: 'github',
        name: 'GitHub',
        type: 'oauth',
        signinUrl: '/api/auth/signin/github',
        callbackUrl: '/api/auth/callback/github'
      });
    }
    
    console.log('Available OAuth providers:', providers);
    
    return NextResponse.json({ providers });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ providers: [] });
  }
}