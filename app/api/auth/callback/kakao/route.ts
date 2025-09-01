import { NextRequest, NextResponse } from 'next/server';
import { userRepository, adminSettingsRepository } from '@/lib/db/repository';
import { hashPassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import { encode } from 'next-auth/jwt';

const BASE_URL = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('🚀 Kakao OAuth callback:', { code: !!code, state, error });

  if (error) {
    console.error('🚀 Kakao OAuth error:', error);
    return NextResponse.redirect(`${BASE_URL}/auth?error=kakao_oauth`);
  }

  if (!code) {
    console.error('🚀 No authorization code received');
    return NextResponse.redirect(`${BASE_URL}/auth?error=no_code`);
  }

  try {
    // DB에서 Kakao OAuth 설정 가져오기 (Repository → Service → Web layer)
    const kakaoClientIdSetting = await adminSettingsRepository.findByKey('auth.oauth.kakao.clientId');
    const kakaoClientSecretSetting = await adminSettingsRepository.findByKey('auth.oauth.kakao.clientSecret');
    
    const KAKAO_CLIENT_ID = kakaoClientIdSetting?.[0]?.value || 
                           process.env.KAKAO_CLIENT_ID || 
                           '';
    const KAKAO_CLIENT_SECRET = kakaoClientSecretSetting?.[0]?.value || 
                               process.env.KAKAO_CLIENT_SECRET || 
                               '';

    console.log('🔍 Using Client ID from:', kakaoClientIdSetting?.[0]?.value ? 'DB' : 'Environment/Default');
    console.log('🔍 Using Client Secret from:', kakaoClientSecretSetting?.[0]?.value ? 'DB' : 'Environment/Default');
    
    if (!KAKAO_CLIENT_ID) {
      console.error('🚀 Kakao Client ID is required');
      return NextResponse.redirect(`${BASE_URL}/auth?error=kakao_config`);
    }
    
    // 액세스 토큰 교환
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KAKAO_CLIENT_ID,
      redirect_uri: `${BASE_URL}/api/auth/callback/kakao`,
      code: code,
    });

    // Client Secret이 있으면 추가 (선택적)
    if (KAKAO_CLIENT_SECRET) {
      tokenParams.append('client_secret', KAKAO_CLIENT_SECRET);
    }

    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();
    console.log('🚀 Token exchange result:', { success: tokenResponse.ok, hasAccessToken: !!tokenData.access_token });

    if (!tokenResponse.ok) {
      console.error('🚀 Token exchange failed:', tokenData);
      return NextResponse.redirect(`${BASE_URL}/auth?error=token_exchange`);
    }

    // 사용자 정보 가져오기
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    });

    const userData = await userResponse.json();
    console.log('🚀 Kakao user data received:', { 
      id: userData.id, 
      email: userData.kakao_account?.email,
      nickname: userData.kakao_account?.profile?.nickname 
    });

    if (!userResponse.ok) {
      console.error('🚀 User info fetch failed:', userData);
      return NextResponse.redirect(`${BASE_URL}/auth?error=user_info`);
    }

    // 카카오 사용자 데이터 구조 파싱
    const kakaoId = userData.id?.toString();
    const email = userData.kakao_account?.email;
    const nickname = userData.kakao_account?.profile?.nickname || email?.split('@')[0] || 'KakaoUser';
    const profileImage = userData.kakao_account?.profile?.profile_image_url;

    if (!email) {
      console.error('🚀 Email is required but not provided by Kakao');
      console.error('🚀 Make sure account_email scope is approved in Kakao Developer Console');
      return NextResponse.redirect(`${BASE_URL}/auth?error=email_required`);
    }

    // 사용자 처리
    console.log('🚀 Processing Kakao user:', { email, nickname });
    
    try {
      let user;
      const existingUser = await userRepository.findByEmail(email);
      
      if (existingUser) {
        console.log('🚀 Existing user found:', email);
        
        // OAuth 연동 여부 확인 (카카오 연동이 안되어 있으면 연동 페이지로)
        if (existingUser.oauthProvider !== 'kakao') {
          console.log('🚀 User exists but not linked to Kakao, redirecting to link page');
          
          // OAuth 데이터를 안전하게 인코딩하여 URL로 전달
          console.log('🚀 Encoding OAuth data for existing user linking...');
          const oauthData = {
            id: kakaoId,
            email: email,
            name: nickname,
            picture: profileImage,
            provider: 'kakao',
          };
          
          const encodedData = Buffer.from(JSON.stringify(oauthData)).toString('base64');
          console.log('🚀 Generated encoded data, redirecting to link page');
          return NextResponse.redirect(`${BASE_URL}/auth/link-account?data=${encodedData}`);
        }
        
        user = existingUser;
      } else {
        console.log('🚀 No existing user, redirecting to link page for new account creation');
        
        // OAuth 데이터를 안전하게 인코딩하여 URL로 전달
        console.log('🚀 Encoding OAuth data for new user creation...');
        const oauthData = {
          id: kakaoId,
          email: email,
          name: nickname,
          picture: profileImage,
          provider: 'kakao',
        };
        
        const encodedData = Buffer.from(JSON.stringify(oauthData)).toString('base64');
        console.log('🚀 Generated encoded data, redirecting to link page');
        return NextResponse.redirect(`${BASE_URL}/auth/link-account?data=${encodedData}`);
      }
      
      // NextAuth JWT 토큰 생성
      console.log('🚀 Creating NextAuth JWT token for Kakao user');
      
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
      cookieStore.set('next-auth.session-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
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
    console.error('🚀 Kakao OAuth process error:', error);
    return NextResponse.redirect(`${BASE_URL}/auth?error=oauth_process`);
  }
}
