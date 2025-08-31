import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { userRepository, adminSettingsRepository } from '@/lib/db/repository';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { cookies } from 'next/headers';

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
    
    console.log('OAuth settings loaded:', {
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

// 동적으로 providers를 생성하는 함수
async function createProviders() {
  const providers: any[] = [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('Authorize function called with:', credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials');
          return null;
        }

        try {
          // Find user by email
          const user = await userRepository.findByEmail(credentials.email);
          console.log('Found user:', user ? 'Yes' : 'No');
          
          if (!user) {
            console.log('User not found');
            return null;
          }
          
          // Verify password
          const isValid = await verifyPassword(credentials.password, user.password);
          console.log('Password valid:', isValid);
          
          if (!isValid) {
            console.log('Invalid password');
            return null;
          }
          
          // Return user data
          console.log('Returning user:', { id: user.id, email: user.email, name: user.name, role: user.role });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Authorize error:', error);
          return null;
        }
      },
    })
  ];

  // OAuth 설정을 DB에서 가져와서 동적으로 추가
  const oauthSettings = await getOAuthSettings();
  if (oauthSettings?.enabled && oauthSettings?.providers?.google?.enabled) {
    const googleConfig = oauthSettings.providers.google;
    if (googleConfig.clientId && googleConfig.clientSecret) {
      console.log('Adding Google provider with:', {
        clientId: googleConfig.clientId,
        hasSecret: !!googleConfig.clientSecret
      });
      
      providers.push(
        GoogleProvider({
          clientId: googleConfig.clientId,
          clientSecret: googleConfig.clientSecret,
          authorization: {
            params: {
              prompt: "consent",
              access_type: "offline",
              response_type: "code"
            }
          },
          // 명시적으로 프로필 설정
          profile(profile) {
            return {
              id: profile.sub,
              name: profile.name,
              email: profile.email,
              image: profile.picture,
            }
          },
        })
      );
    }
  }

  return providers;
}

// NextAuth 설정을 생성하는 함수
export async function createAuthOptions(): Promise<NextAuthOptions> {
  const providers = await createProviders();
  
  console.log('=== NextAuth Configuration ===');
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
  console.log('NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);
  console.log('Providers count:', providers.length);
  
  return {
    secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
    providers,
    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
      async signIn({ user, account, profile, email, credentials }) {
        console.log('=== SignIn Callback Debug ===');
        console.log('Provider:', account?.provider);
        console.log('Account:', JSON.stringify(account, null, 2));
        console.log('User:', JSON.stringify(user, null, 2));
        console.log('Profile:', JSON.stringify(profile, null, 2));
        console.log('Credentials:', credentials ? 'exists' : 'null');
        
        if (account?.provider === 'google') {
          try {
            const userEmail = user.email!;
            console.log('Processing Google OAuth for email:', userEmail);
            
            const existingUser = await userRepository.findByEmail(userEmail);
            
            if (existingUser) {
              console.log('Existing user found for Google OAuth:', userEmail);
              // 기존 사용자가 있으면 그대로 사용
              user.id = existingUser.id;
              user.role = existingUser.role;
              return true;
            } else {
              console.log('Creating new user for Google OAuth:', userEmail);
              // 새 사용자 생성
              const newUser = await userRepository.create({
                email: userEmail,
                name: user.name || userEmail.split('@')[0],
                password: await hashPassword(Math.random().toString(36).slice(-8)), // 랜덤 비밀번호
                role: 'user',
              });
              
              user.id = newUser.id;
              user.role = newUser.role;
              return true;
            }
          } catch (error) {
            console.error('OAuth sign in error - Details:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
            return false;
          }
        }
        
        return true;
      },
      async jwt({ token, user }) {
        console.log('JWT callback - user:', user ? 'exists' : 'null');
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
          token.role = user.role;
        }
        console.log('JWT token:', { ...token, iat: 'hidden', exp: 'hidden' });
        return token;
      },
      async session({ session, token }) {
        console.log('Session callback - token:', token ? 'exists' : 'null');
        if (token && session.user) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = token.name as string;
          session.user.role = token.role as string;
        }
        console.log('Final session:', session);
        return session;
      },
    },
    pages: {
      signIn: '/auth',
      error: '/auth',
    },
    debug: true,
    events: {
      async signIn(message) {
        console.log('NextAuth Event - signIn:', message);
      },
      async signOut(message) {
        console.log('NextAuth Event - signOut:', message);
      },
      async createUser(message) {
        console.log('NextAuth Event - createUser:', message);
      },
      async linkAccount(message) {
        console.log('NextAuth Event - linkAccount:', message);
      },
      async session(message) {
        console.log('NextAuth Event - session:', message);
      },
    },
  };
}

// Handler를 캐시하여 재사용
let cachedHandler: any = null;
let cachedAuthOptions: NextAuthOptions | null = null;

// 다른 파일에서 사용할 수 있도록 authOptions를 export
export async function getAuthOptions(): Promise<NextAuthOptions> {
  if (!cachedAuthOptions) {
    cachedAuthOptions = await createAuthOptions();
  }
  return cachedAuthOptions;
}

// 이전 버전과의 호환성을 위한 authOptions export
export const authOptions = getAuthOptions();

// NextAuth 핸들러 export
export async function GET(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  const params = await context.params;
  console.log('NextAuth GET request:', params.nextauth);
  
  const authOptions = await getAuthOptions();
  const handler = NextAuth(authOptions);
  
  return handler(req, context);
}

export async function POST(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  const params = await context.params;
  console.log('NextAuth POST request:', params.nextauth);
  
  const authOptions = await getAuthOptions();
  const handler = NextAuth(authOptions);
  
  return handler(req, context);
}