import { NextResponse } from 'next/server';
import { adminSettingsRepository } from '@/lib/db/repository';

export async function GET() {
  try {
    // Google OAuth 설정 확인
    const googleEnabled = await adminSettingsRepository.findByKey('auth.oauth.google.enabled');
    const githubEnabled = await adminSettingsRepository.findByKey('auth.oauth.github.enabled');

    const kakaoEnabled = await adminSettingsRepository.findByKey('auth.oauth.kakao.enabled');
    const naverEnabled = await adminSettingsRepository.findByKey('auth.oauth.naver.enabled');

    const providers = [];

    // 각 OAuth provider가 활성화되어 있는지 확인하고 배열에 추가
    if (googleEnabled?.[0]?.value === 'true') {
      const googleClientId = await adminSettingsRepository.findByKey('auth.oauth.google.clientId');
      
      providers.push({
        id: 'google',
        name: 'Google',
        type: 'oauth',
        clientId: googleClientId?.[0]?.value || process.env.GOOGLE_CLIENT_ID 
      });
    }

    if (githubEnabled?.[0]?.value === 'true') {
      const githubClientId = await adminSettingsRepository.findByKey('auth.oauth.github.clientId');
      
      providers.push({
        id: 'github',
        name: 'GitHub', 
        type: 'oauth',
        clientId: githubClientId?.[0]?.value || process.env.GITHUB_CLIENT_ID
      });
    }



    if (kakaoEnabled?.[0]?.value === 'true') {
      const kakaoClientId = await adminSettingsRepository.findByKey('auth.oauth.kakao.clientId');
      
      providers.push({
        id: 'kakao',
        name: 'Kakao',
        type: 'oauth',
        clientId: kakaoClientId?.[0]?.value || process.env.KAKAO_CLIENT_ID
      });
    }

    if (naverEnabled?.[0]?.value === 'true') {
      const naverClientId = await adminSettingsRepository.findByKey('auth.oauth.naver.clientId');
      
      providers.push({
        id: 'naver',
        name: 'Naver',
        type: 'oauth',
        clientId: naverClientId?.[0]?.value || process.env.NAVER_CLIENT_ID
      });
    }

    return NextResponse.json(providers);

  } catch (error) {
    console.error('Failed to get OAuth provider settings:', error);
    return NextResponse.json([]);
  }
}
