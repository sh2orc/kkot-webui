import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
// GoogleProvider는 제거됨 - 커스텀 Google OAuth 핸들러 사용
import { userRepository, adminSettingsRepository } from '@/lib/db/repository';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { cookies } from 'next/headers';

// OAuth 설정을 DB에서 가져오는 함수
async function getOAuthSettings() {
  try {
    console.log('🔍 Fetching OAuth settings from DB...');
    
    // Google OAuth 설정 확인
    const googleEnabled = await adminSettingsRepository.findByKey('auth.oauth.google.enabled');
    const googleClientId = await adminSettingsRepository.findByKey('auth.oauth.google.clientId');
    const googleClientSecret = await adminSettingsRepository.findByKey('auth.oauth.google.clientSecret');
    
    console.log('🔍 Raw DB values:', {
      googleEnabled: googleEnabled?.[0]?.value,
      googleClientId: googleClientId?.[0]?.value ? 'EXISTS' : 'MISSING',
      googleClientSecret: googleClientSecret?.[0]?.value ? 'EXISTS' : 'MISSING'
    });
    
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
    
    console.log('🔍 OAuth settings loaded:', {
      google: {
        enabled: oauthSettings.providers.google.enabled,
        hasClientId: !!oauthSettings.providers.google.clientId,
        hasClientSecret: !!oauthSettings.providers.google.clientSecret,
        clientIdLength: oauthSettings.providers.google.clientId?.length,
        secretLength: oauthSettings.providers.google.clientSecret?.length
      }
    });
    
    return oauthSettings;
  } catch (error) {
    console.error('❌ Failed to get OAuth settings:', error);
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
          
          // Check if user is guest
          if (user.role === 'guest') {
            console.log('Guest user attempted login');
            throw new Error('GUEST_ACCOUNT');
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
    // Google OAuth는 이제 커스텀 핸들러 (/api/google/signin, /api/google/callback)를 사용합니다.
  ];

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
        } else if (token.email) {
          // Refresh user data from database to get latest role
          try {
            const dbUser = await userRepository.findByEmail(token.email as string);
            if (dbUser) {
              token.id = dbUser.id;
              token.email = dbUser.email;
              token.name = dbUser.username;
              token.role = dbUser.role;
            }
          } catch (error) {
            console.error('Error refreshing user data in JWT callback:', error);
          }
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
          
          // 실시간 권한 체크: 매번 DB에서 최신 권한 정보 가져오기
          try {
            const user = await userRepository.findByEmail(token.email as string);
            if (user) {
              session.user.role = user.role; // DB에서 가져온 최신 권한 사용
              console.log('Updated role from DB:', user.role);
            } else {
              session.user.role = token.role as string; // 사용자가 없으면 토큰의 권한 사용
            }
          } catch (error) {
            console.error('Error fetching user role from DB:', error);
            session.user.role = token.role as string; // 에러 시 토큰의 권한 사용
          }
        }
        console.log('Final session:', session);
        return session;
      },
    },
    pages: {
      signIn: '/auth',
      error: '/auth',
    },
    logger: {
      error(code, metadata) {
        console.error('🔥 NextAuth Error:', code, metadata);
      },
      warn(code) {
        console.warn('🔥 NextAuth Warning:', code);
      },
      debug(code, metadata) {
        console.log('🔥 NextAuth Debug:', code, metadata);
      }
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

// Main authOptions export
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
  providers: [
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
          
          // Update last login time
          await userRepository.updateLastLogin(user.id);
          console.log('Updated last login time for user:', user.id);

          // Return user data
          console.log('Returning user:', { id: user.id, email: user.email, name: user.username, role: user.role });
          return {
            id: user.id,
            email: user.email,
            name: user.username,
            role: user.role,
          };
        } catch (error) {
          console.error('Authorize error:', error);
          return null;
        }
      },
    })
    // Google OAuth는 이제 커스텀 핸들러 (/api/google/signin, /api/google/callback)를 사용합니다.
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log('=== SignIn Callback Debug ===');
      console.log('Provider:', account?.provider);
      console.log('User:', JSON.stringify(user, null, 2));
      
      if (account?.provider === 'google') {
        try {
          console.log('Processing Google OAuth sign-in...');
          
          if (!user.email) {
            console.error('No email provided by Google');
            return false;
          }
          
          // Check if user exists
          const existingUser = await userRepository.findByEmail(user.email);
          
          if (existingUser) {
            console.log('Existing user found, allowing sign-in');
            // Update user info from Google if needed
            user.id = existingUser.id;
            user.name = existingUser.username;
            user.role = existingUser.role;
            return true;
          } else {
            console.log('Creating new user from Google OAuth');
            // Create new user
            const newUser = await userRepository.create({
              username: user.name || user.email.split('@')[0],
              email: user.email,
              password: await hashPassword(Math.random().toString(36).slice(-8)), // Random password for OAuth users
              role: 'user'
            });
            
            if (newUser && newUser.length > 0) {
              user.id = newUser[0].id;
              user.name = newUser[0].username;
              user.role = newUser[0].role;
              console.log('New user created successfully');
              return true;
            } else {
              console.error('Failed to create new user');
              return false;
            }
          }
        } catch (error) {
          console.error('Error in Google OAuth sign-in:', error);
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
      } else if (token.email) {
        // Refresh user data from database to get latest role
        try {
          const dbUser = await userRepository.findByEmail(token.email as string);
          if (dbUser) {
            token.id = dbUser.id;
            token.email = dbUser.email;
            token.name = dbUser.username;
            token.role = dbUser.role;
          }
        } catch (error) {
          console.error('Error refreshing user data in JWT callback:', error);
        }
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

// Create NextAuth handler with main authOptions
const handler = NextAuth(authOptions);

// NextAuth 핸들러 export
export async function GET(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  const params = await context.params;
  console.log('🔥 Static NextAuth GET request:', params.nextauth);
  
  try {
    const response = await handler(req, context);
    
    // 에러 응답인 경우 상세 로깅
    if (response.status >= 300) {
      console.log('🔥 NextAuth response status:', response.status);
      console.log('🔥 NextAuth response headers:', Object.fromEntries(response.headers));
      
      // 리다이렉트 URL에서 에러 확인
      const location = response.headers.get('location');
      if (location && location.includes('error=')) {
        console.log('🔥 Error detected in redirect:', location);
      }
    }
    
    return response;
  } catch (error) {
    console.error('🔥 NextAuth handler error:', error);
    throw error;
  }
}

export async function POST(req: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  const params = await context.params;
  console.log('🔥 Static NextAuth POST request:', params.nextauth);
  
  return handler(req, context);
}