import { adminSettingsRepository } from '@/lib/db/repository';

// Function to set OAuth configuration as environment variables
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
    

    
    console.log('OAuth environment setup completed');
  } catch (error) {
    console.error('Error setting up OAuth environment:', error);
  }
}
