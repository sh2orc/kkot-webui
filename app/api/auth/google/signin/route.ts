import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = '142450213226-mqloh60l5f1cb400b7tqcpm13v8rcbg8.apps.googleusercontent.com';
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    // 구글 OAuth 로그인 URL 생성
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    
    googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', `${BASE_URL}/api/google/callback`);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');
    
    // 상태값 생성 (보안을 위해)
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    googleAuthUrl.searchParams.set('state', state);

    console.log('🚀 Redirecting to Google OAuth:', googleAuthUrl.toString());
    
    return NextResponse.redirect(googleAuthUrl.toString());
    
  } catch (error) {
    console.error('🚀 Google signin error:', error);
    return NextResponse.redirect(`${BASE_URL}/auth?error=signin_error`);
  }
}
