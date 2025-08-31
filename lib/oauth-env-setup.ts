import { adminSettingsRepository } from '@/lib/db/repository';

// OAuth 설정을 환경변수로 설정하는 함수
export async function setupOAuthEnvironment() {
  try {
    // Google OAuth
    const googleEnabled = await adminSettingsRepository.findByKey('auth.oauth.google.enabled');
    const googleClientId = await adminSettingsRepository.findByKey('auth.oauth.google.clientId');
    const googleClientSecret = await adminSettingsRepository.findByKey('auth.oauth.google.clientSecret');
    
    if (googleEnabled?.[0]?.value === 'true' && googleClientId?.[0]?.value && googleClientSecret?.[0]?.value) {
      process.env.GOOGLE_CLIENT_ID = googleClientId[0].value;
      process.env.GOOGLE_CLIENT_SECRET = googleClientSecret[0].value;
      console.log('✓ Google OAuth environment variables set');
    }
    
    // GitHub OAuth
    const githubEnabled = await adminSettingsRepository.findByKey('auth.oauth.github.enabled');
    const githubClientId = await adminSettingsRepository.findByKey('auth.oauth.github.clientId');
    const githubClientSecret = await adminSettingsRepository.findByKey('auth.oauth.github.clientSecret');
    
    if (githubEnabled?.[0]?.value === 'true' && githubClientId?.[0]?.value && githubClientSecret?.[0]?.value) {
      process.env.GITHUB_CLIENT_ID = githubClientId[0].value;
      process.env.GITHUB_CLIENT_SECRET = githubClientSecret[0].value;
      console.log('✓ GitHub OAuth environment variables set');
    }
    
    console.log('OAuth environment setup completed');
  } catch (error) {
    console.error('Error setting up OAuth environment:', error);
  }
}
