import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { userRepository, adminSettingsRepository } from '@/lib/db/repository';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getDb } from '@/lib/db/server';

// OAuth 설정을 DB에서 가져오는 함수
async function getOAuthSettings() {
  try {
    const db = getDb();
    const settings = await adminSettingsRepository.findById(db, 'oauth_settings');
    if (settings?.value) {
      return JSON.parse(settings.value);
    }
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
      providers.push(
        GoogleProvider({
          clientId: googleConfig.clientId,
          clientSecret: googleConfig.clientSecret,
        })
      );
    }
  }

  return providers;
}

// NextAuth 설정을 생성하는 함수
async function createAuthOptions(): Promise<NextAuthOptions> {
  const providers = await createProviders();
  
  return {
    secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
    providers,
    session: {
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
      async signIn({ user, account, profile }) {
        console.log('SignIn callback - provider:', account?.provider);
        
        if (account?.provider === 'google') {
          try {
            const email = user.email!;
            const existingUser = await userRepository.findByEmail(email);
            
            if (existingUser) {
              console.log('Existing user found for Google OAuth:', email);
              // 기존 사용자가 있으면 그대로 사용
              user.id = existingUser.id;
              user.role = existingUser.role;
              return true;
            } else {
              console.log('Creating new user for Google OAuth:', email);
              // 새 사용자 생성
              const newUser = await userRepository.create({
                email,
                name: user.name || email.split('@')[0],
                password: await hashPassword(Math.random().toString(36).slice(-8)), // 랜덤 비밀번호
                role: 'user',
              });
              
              user.id = newUser.id;
              user.role = newUser.role;
              return true;
            }
          } catch (error) {
            console.error('OAuth sign in error:', error);
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
  };
}

// Handler를 캐시하여 재사용
let cachedHandler: any = null;

async function getHandler() {
  if (!cachedHandler) {
    const authOptions = await createAuthOptions();
    cachedHandler = NextAuth(authOptions);
  }
  return cachedHandler;
}

export async function GET(request: Request) {
  const handler = await getHandler();
  return handler(request);
}

export async function POST(request: Request) {
  const handler = await getHandler();
  return handler(request);
}