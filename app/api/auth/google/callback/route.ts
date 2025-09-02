import { NextRequest, NextResponse } from 'next/server';
import { userRepository, adminSettingsRepository } from '@/lib/db/repository';
import { hashPassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import { encode } from 'next-auth/jwt';

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('🚀 Google OAuth callback:', { code: !!code, state, error });

  if (error) {
    console.error('🚀 Google OAuth error:', error);
    return NextResponse.redirect(`${BASE_URL}/auth?error=google_oauth`);
  }

  if (!code) {
    console.error('🚀 No authorization code received');
    return NextResponse.redirect(`${BASE_URL}/auth?error=no_code`);
  }

  try {
    // DB에서 Google OAuth 설정 가져오기
    const googleClientIdSetting = await adminSettingsRepository.findByKey('auth.oauth.google.clientId');
    const googleClientSecretSetting = await adminSettingsRepository.findByKey('auth.oauth.google.clientSecret');
    
    const GOOGLE_CLIENT_ID = googleClientIdSetting?.[0]?.value || process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = googleClientSecretSetting?.[0]?.value || process.env.GOOGLE_CLIENT_SECRET;
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('❌ Google OAuth credentials not configured');
      return NextResponse.redirect(new URL('/auth?error=OAuthNotConfigured', request.url));
    }
    
    console.log('🔍 Using Client ID from:', googleClientIdSetting?.[0]?.value ? 'DB' : 'Environment');
    console.log('🔍 Using Client Secret from:', googleClientSecretSetting?.[0]?.value ? 'DB' : 'Environment');
    // 액세스 토큰 교환
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${BASE_URL}/api/google/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('🚀 Token exchange result:', { success: tokenResponse.ok, hasAccessToken: !!tokenData.access_token });

    if (!tokenResponse.ok) {
      console.error('🚀 Token exchange failed:', tokenData);
      return NextResponse.redirect(`${BASE_URL}/auth?error=token_exchange`);
    }

    // 사용자 정보 가져오기
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    console.log('🚀 User data received:', { email: userData.email, name: userData.name });

    if (!userResponse.ok) {
      console.error('🚀 User info fetch failed:', userData);
      return NextResponse.redirect(`${BASE_URL}/auth?error=user_info`);
    }

    // 사용자 처리
    console.log('🚀 Processing user:', { email: userData.email, name: userData.name });
    
    try {
      let user;
      const existingUser = await userRepository.findByEmail(userData.email);
      
      if (existingUser) {
        console.log('🚀 Existing user found:', userData.email);
        console.log('🚀 User object keys:', Object.keys(existingUser));
        console.log('🚀 googleId field:', existingUser.googleId);
        console.log('🚀 google_id field:', existingUser.google_id);
        
        // OAuth 연동 여부 확인 (googleId 또는 google_id 모두 체크)
        const hasGoogleId = existingUser.googleId || existingUser.google_id;
        if (!hasGoogleId) {
          console.log('🚀 User exists but not linked to Google, redirecting to link page');
          
          // OAuth 데이터를 임시 저장
          const { storeOAuthData } = await import('@/lib/oauth-temp-storage');
          const linkToken = storeOAuthData({
            id: userData.id,
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            provider: 'google',
          });
          
          return NextResponse.redirect(`${BASE_URL}/auth/link-account?token=${linkToken}`);
        }
        
        user = existingUser;
      } else {
        console.log('🚀 No existing user, redirecting to link page for new account creation');
        
        // OAuth 데이터를 임시 저장
        const { storeOAuthData } = await import('@/lib/oauth-temp-storage');
        const linkToken = storeOAuthData({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          provider: 'google',
        });
        
        return NextResponse.redirect(`${BASE_URL}/auth/link-account?token=${linkToken}`);
      }
      
      // Update last login time
      await userRepository.updateLastLogin(user.id);
      console.log('🚀 Updated last login time for user:', user.id);

      // NextAuth JWT 토큰 생성
      console.log('🚀 Creating NextAuth JWT token');
      
      const authUser = {
        id: user.id.toString(),
        email: user.email,
        name: user.username,
        role: user.role,
      };
      
      const secret = process.env.NEXTAUTH_SECRET;
      const maxAge = 30 * 24 * 60 * 60; // 30일
      
      const token = await encode({
        token: {
          id: authUser.id,
          sub: authUser.id,
          email: authUser.email,
          name: authUser.name,
          role: authUser.role,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + maxAge,
        },
        secret: secret!,
        maxAge,
      });
      
      console.log('🚀 NextAuth JWT token created:', !!token);
      
      // 세션 쿠키 설정
      const cookieStore = await cookies();
      const isLocalhost = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';
      cookieStore.set('next-auth.session-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && !isLocalhost,
        sameSite: 'lax',
        maxAge,
        path: '/',
      });
      
      console.log('🚀 NextAuth session cookie set, redirecting to chat');
      return NextResponse.redirect(`${BASE_URL}/chat`);
      
    } catch (userError) {
      console.error('🚀 User processing error:', userError);
      return NextResponse.redirect(`${BASE_URL}/auth?error=user_processing`);
    }

  } catch (error) {
    console.error('🚀 OAuth process error:', error);
    return NextResponse.redirect(`${BASE_URL}/auth?error=oauth_process`);
  }
}
