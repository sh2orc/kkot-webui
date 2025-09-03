#!/usr/bin/env node
import { adminSettingsRepository } from '../lib/db/repository';
import { initDatabase } from '../lib/db/setup';

async function setupOAuth() {
  console.log('Setting up OAuth configuration...\n');
  
  // Initialize database
  await initDatabase();
  
  // Example OAuth settings (need to be changed to actual values)
  const oauthSettings = [
    // Google OAuth
    { key: 'auth.oauth.google.enabled', value: 'false' },
    { key: 'auth.oauth.google.clientId', value: '' },
    { key: 'auth.oauth.google.clientSecret', value: '' },
    

    
    // Microsoft OAuth
    { key: 'auth.oauth.microsoft.enabled', value: 'false' },
    { key: 'auth.oauth.microsoft.clientId', value: '' },
    { key: 'auth.oauth.microsoft.clientSecret', value: '' },
    
    // Kakao OAuth
    { key: 'auth.oauth.kakao.enabled', value: 'false' },
    { key: 'auth.oauth.kakao.clientId', value: '' },
    { key: 'auth.oauth.kakao.clientSecret', value: '' },
    
    // Naver OAuth
    { key: 'auth.oauth.naver.enabled', value: 'false' },
    { key: 'auth.oauth.naver.clientId', value: '' },
    { key: 'auth.oauth.naver.clientSecret', value: '' },
  ];
  
  for (const setting of oauthSettings) {
    try {
      const existing = await adminSettingsRepository.findByKey(setting.key);
      if (!existing || existing.length === 0) {
        await adminSettingsRepository.upsert(setting.key, setting.value);
        console.log(`✓ Created setting: ${setting.key}`);
      } else {
        console.log(`- Setting already exists: ${setting.key}`);
      }
    } catch (error) {
      console.error(`✗ Failed to create setting ${setting.key}:`, error);
    }
  }
  
  console.log('\nOAuth setup completed!');
  console.log('Please configure your OAuth providers in /admin/general');
  process.exit(0);
}

setupOAuth().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
