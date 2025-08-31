import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { systemSettings } from '../lib/db/schema';
import { inArray } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function setupOAuthEnv() {
  try {
    // 직접 DB 연결
    const sqlite = new Database('data.db');
    const db = drizzle(sqlite);
    
    const settings = await db.select()
      .from(systemSettings)
      .where(inArray(systemSettings.key, [
        'auth.oauth.google.enabled',
        'auth.oauth.google.clientId',
        'auth.oauth.google.clientSecret',
      ]));
    
    const googleEnabled = settings.find((s: any) => s.key === 'auth.oauth.google.enabled')?.value === 'true';
    const googleClientId = settings.find((s: any) => s.key === 'auth.oauth.google.clientId')?.value;
    const googleClientSecret = settings.find((s: any) => s.key === 'auth.oauth.google.clientSecret')?.value;
    
    if (googleEnabled && googleClientId && googleClientSecret) {
      console.log('Google OAuth settings found in DB:');
      console.log('Client ID:', googleClientId);
      console.log('Client Secret:', googleClientSecret.substring(0, 10) + '...');
      
      // .env.local 파일 경로
      const envPath = path.join(process.cwd(), '.env.local');
      
      // 기존 .env.local 파일 읽기
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      
      // Google OAuth 설정 추가/업데이트
      const lines = envContent.split('\n');
      const newLines: string[] = [];
      let googleIdFound = false;
      let googleSecretFound = false;
      
      for (const line of lines) {
        if (line.startsWith('GOOGLE_CLIENT_ID=')) {
          newLines.push(`GOOGLE_CLIENT_ID=${googleClientId}`);
          googleIdFound = true;
        } else if (line.startsWith('GOOGLE_CLIENT_SECRET=')) {
          newLines.push(`GOOGLE_CLIENT_SECRET=${googleClientSecret}`);
          googleSecretFound = true;
        } else {
          newLines.push(line);
        }
      }
      
      if (!googleIdFound) {
        newLines.push(`GOOGLE_CLIENT_ID=${googleClientId}`);
      }
      if (!googleSecretFound) {
        newLines.push(`GOOGLE_CLIENT_SECRET=${googleClientSecret}`);
      }
      
      // 파일 쓰기
      fs.writeFileSync(envPath, newLines.join('\n'));
      console.log('\n✅ .env.local file updated with Google OAuth settings');
      console.log('Please restart your Next.js server for the changes to take effect.');
    } else {
      console.log('Google OAuth is not enabled or credentials are missing in DB');
    }
    
    sqlite.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setupOAuthEnv();