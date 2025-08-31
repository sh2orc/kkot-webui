import { NextResponse } from 'next/server';
import { adminSettingsRepository } from '@/lib/db/repository';

// OAuth 설정을 DB에서 가져오는 함수
async function getOAuthSettings() {
  try {
    // Google OAuth 설정 확인
    const googleEnabled = await adminSettingsRepository.findByKey('auth.oauth.google.enabled');
    const googleClientId = await adminSettingsRepository.findByKey('auth.oauth.google.clientId');
    const googleClientSecret = await adminSettingsRepository.findByKey('auth.oauth.google.clientSecret');
    
    const oauthSettings = {
      enabled: true, // OAuth 자체는 활성화
      providers: {
        google: {
          enabled: googleEnabled?.[0]?.value === 'true',
          clientId: googleClientId?.[0]?.value || '',
          clientSecret: googleClientSecret?.[0]?.value || ''
        }
      }
    };
    
    console.log('OAuth settings from DB:', {
      google: {
        enabled: oauthSettings.providers.google.enabled,
        hasClientId: !!oauthSettings.providers.google.clientId,
        hasClientSecret: !!oauthSettings.providers.google.clientSecret
      }
    });
    
    return oauthSettings;
  } catch (error) {
    console.error('Failed to get OAuth settings:', error);
  }
  return null;
}

export async function GET() {
  try {
    const providers = [];
    
    // OAuth 설정을 DB에서 가져와서 활성화된 provider만 반환
    const oauthSettings = await getOAuthSettings();
    
    if (oauthSettings?.enabled && oauthSettings?.providers) {
      // Google OAuth
      if (oauthSettings.providers.google?.enabled) {
        providers.push({
          id: 'google',
          name: 'Google',
          type: 'oauth',
          signinUrl: '/api/auth/signin/google',
          callbackUrl: '/api/auth/callback/google'
        });
      }
      
      // GitHub OAuth (추후 추가 가능)
      if (oauthSettings.providers.github?.enabled) {
        providers.push({
          id: 'github',
          name: 'GitHub',
          type: 'oauth',
          signinUrl: '/api/auth/signin/github',
          callbackUrl: '/api/auth/callback/github'
        });
      }
      
      // 다른 OAuth providers도 여기에 추가 가능
    }
    
    return NextResponse.json({ 
      providers,
      success: true 
    });
  } catch (error) {
    console.error('Error fetching OAuth providers:', error);
    return NextResponse.json({ 
      providers: [],
      success: false,
      error: 'Failed to fetch providers' 
    }, { status: 500 });
  }
}