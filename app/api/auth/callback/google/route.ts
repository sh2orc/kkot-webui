import { NextRequest, NextResponse } from 'next/server';
import { userRepository, adminSettingsRepository } from '@/lib/db/repository';
import { hashPassword } from '@/lib/auth';
import { cookies } from 'next/headers';
import { createJWTToken, JWT_CONFIG } from '@/lib/jwt-auth';

const BASE_URL = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${BASE_URL}/auth?error=google_oauth`);
  }

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/auth?error=no_code`);
  }

  try {
    // Get Google OAuth settings from DB (Repository → Service → Web layer)
    const googleClientIdSetting = await adminSettingsRepository.findByKey('auth.oauth.google.clientId');
    const googleClientSecretSetting = await adminSettingsRepository.findByKey('auth.oauth.google.clientSecret');
    
    const GOOGLE_CLIENT_ID = googleClientIdSetting?.[0]?.value || process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = googleClientSecretSetting?.[0]?.value || process.env.GOOGLE_CLIENT_SECRET;
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(new URL('/auth?error=OAuthNotConfigured', request.url));
    }

    // Exchange access token
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
        redirect_uri: `${BASE_URL}/api/auth/callback/google`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return NextResponse.redirect(`${BASE_URL}/auth?error=token_exchange`);
    }

    // Get user information
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      return NextResponse.redirect(`${BASE_URL}/auth?error=user_info`);
    }

    // Handle user    
    try {
      let user;
      const existingUser = await userRepository.findByEmail(userData.email);
      
      if (existingUser) {        
        // Check OAuth integration status
        if (!existingUser.googleId) {          
          // Safely encode OAuth data and pass it via URL
          const oauthData = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            provider: 'google',
          };
          
          const encodedData = Buffer.from(JSON.stringify(oauthData)).toString('base64');
          return NextResponse.redirect(`${BASE_URL}/auth/link-account?data=${encodedData}`);
        }
        
        user = existingUser;
      } else {        
        // Safely encode OAuth data and pass it via URL
        const oauthData = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          provider: 'google',
        };
        
        const encodedData = Buffer.from(JSON.stringify(oauthData)).toString('base64');
        return NextResponse.redirect(`${BASE_URL}/auth/link-account?data=${encodedData}`);
      }
      
      // Generate NextAuth JWT token      
      const token = await createJWTToken({
        id: user.id.toString(),
        email: user.email,
        name: user.username,
        role: user.role,
      });
            
      // Set session cookie
      const cookieStore = await cookies();
      const isLocalhost = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';
      cookieStore.set('next-auth.session-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && !isLocalhost,
        sameSite: 'lax',
        maxAge: JWT_CONFIG.maxAge,
        path: '/',
      });
      
      return NextResponse.redirect(`${BASE_URL}/chat`);
      
    } catch (userError) {
      return NextResponse.redirect(`${BASE_URL}/auth?error=user_processing`);
    }

  } catch (error) {
    return NextResponse.redirect(`${BASE_URL}/auth?error=oauth_process`);
  }
}
