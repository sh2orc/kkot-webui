import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
// GoogleProvider는 제거됨 - 커스텀 Google OAuth 핸들러 사용
import { userRepository, adminSettingsRepository, groupRepository } from '@/lib/db/repository';
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
          
          // Allow guest users to login but they will be redirected later
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
              // Create 새 사용자
              const newUser = await userRepository.create({
                email: userEmail,
                username: user.name || userEmail.split('@')[0],
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
      async jwt({ token, user, trigger }) {
        // 로그인 시 또는 강제 업데이트 시
        if (user || trigger === 'update') {
          if (user) {
            token.id = user.id;
            token.email = user.email;
            token.name = user.name;
            token.role = user.role;
            token.status = user.status || 'active';
          }
          token.lastUpdated = Date.now(); // 마지막 업데이트 시간 기록
        } else if (token.email) {
          // 토큰이 5분 이상 오래됐을 때만 DB에서 최신 정보 조회
          const tokenAge = Date.now() - (typeof token.lastUpdated === 'number' ? token.lastUpdated : 0);
          const maxAge = 5 * 60 * 1000; // 5분
          
          if (tokenAge > maxAge) {
            try {
              console.log('Token is old, refreshing user data from DB');
              const dbUser = await userRepository.findByEmail(token.email as string);
              if (dbUser) {
                // 권한이 변경됐는지 확인
                const roleChanged = token.role !== dbUser.role;
                const statusChanged = token.status !== dbUser.status;
                
                if (roleChanged || statusChanged) {
                  console.log('User permissions changed:', {
                    oldRole: token.role,
                    newRole: dbUser.role,
                    oldStatus: token.status,
                    newStatus: dbUser.status
                  });
                }
                
                token.id = dbUser.id;
                token.email = dbUser.email;
                token.name = dbUser.username;
                token.role = dbUser.role;
                token.status = dbUser.status;
                token.lastUpdated = Date.now();
              }
            } catch (error) {
              console.error('Error refreshing user data in JWT callback:', error);
            }
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (token && session.user) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = token.name as string;
          session.user.role = token.role as string; // JWT 토큰의 권한 사용 (이미 최신화됨)
          session.user.status = token.status as string; // 상태 정보도 추가
        }
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
        // console.log('NextAuth Event - session:', message);
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
        
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find user by email
          const user = await userRepository.findByEmail(credentials.email);
          
          if (!user) {
            console.log('User not found');
            return null;
          }
          
          // Verify password
          const isValid = await verifyPassword(credentials.password, user.password);
          
          if (!isValid) {
            console.log('Invalid password');
            return null;
          }
          
          // Update last login time
          console.log('🔥 Calling updateLastLogin for user:', user.id);
          try {
            await userRepository.updateLastLogin(user.id);
            console.log('✅ Successfully updated last login time');
          } catch (error) {
            console.error('❌ Failed to update last login time:', error);
          }

          // Return user data
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
            // Update user info from Google if needed
            user.id = existingUser.id;
            user.name = existingUser.username;
            user.role = existingUser.role;
            return true;
          } else {            
            // Check signup enabled setting
            const signupEnabledSetting = await adminSettingsRepository.findByKey('auth.signupEnabled');
            const signupEnabled = signupEnabledSetting?.[0]?.value === 'true';
            
            // Check if first user
            const allUsers = await userRepository.findAll();
            const isFirstUser = allUsers.length === 0;
            
            // Determine user role
            let userRole = 'user';
            if (isFirstUser) {
              userRole = 'admin';
            } else if (!signupEnabled) {
              userRole = 'guest';
            }
            
            // Create new user
            const newUser = await userRepository.create({
              username: user.name || user.email.split('@')[0],
              email: user.email,
              password: await hashPassword(Math.random().toString(36).slice(-8)), // Random password for OAuth users
              role: userRole
            });
            
            if (newUser && newUser.length > 0) {
              user.id = newUser[0].id;
              user.name = newUser[0].username;
              user.role = newUser[0].role;
              
              // Add user to appropriate group based on role
              try {
                if (userRole === 'admin') {
                  // Add admin users to admin group
                  const adminGroup = await groupRepository.findByName('admin');
                  if (adminGroup) {
                    await groupRepository.addUser(adminGroup.id, newUser[0].id, 'system');
                    console.log(`Added OAuth admin user ${user.email} to admin group`);
                  } else {
                    // Create admin group if it doesn't exist
                    const [createdGroup] = await groupRepository.create({
                      name: 'admin',
                      description: 'System administrators with full access',
                      isSystem: true,
                      isActive: true
                    });
                    await groupRepository.addUser(createdGroup.id, newUser[0].id, 'system');
                    console.log(`Created admin group and added OAuth user ${user.email}`);
                  }
                } else if (userRole === 'user' && signupEnabled) {
                  // Add regular users to default group when signup is enabled
                  const defaultGroup = await groupRepository.findByName('default');
                  if (defaultGroup) {
                    await groupRepository.addUser(defaultGroup.id, newUser[0].id, 'system');
                    console.log(`Added OAuth user ${user.email} to default group`);
                  } else {
                    // Create default group if it doesn't exist
                    const [createdGroup] = await groupRepository.create({
                      name: 'default',
                      description: 'Default group for all users',
                      isSystem: true,
                      isActive: true
                    });
                    await groupRepository.addUser(createdGroup.id, newUser[0].id, 'system');
                    console.log(`Created default group and added OAuth user ${user.email}`);
                  }
                }
              } catch (error) {
                console.error('Failed to add OAuth user to group:', error);
                // Don't fail the registration if group assignment fails
              }
              
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
    async jwt({ token, user, trigger }) {
      // 로그인 시 또는 강제 업데이트 시
      if (user || trigger === 'update') {
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
          token.role = user.role;
          token.status = user.status || 'active';
        }
        token.lastUpdated = Date.now(); // 마지막 업데이트 시간 기록
      } else if (token.email) {
        // 토큰이 5분 이상 오래됐을 때만 DB에서 최신 정보 조회
        const tokenAge = Date.now() - (typeof token.lastUpdated === 'number' ? token.lastUpdated : 0);
        const maxAge = 5 * 60 * 1000; // 5분
        
        if (tokenAge > maxAge) {
          try {
            console.log('Token is old, refreshing user data from DB');
            const dbUser = await userRepository.findByEmail(token.email as string);
            if (dbUser) {
              // 권한이 변경됐는지 확인
              const roleChanged = token.role !== dbUser.role;
              const statusChanged = token.status !== dbUser.status;
              
              if (roleChanged || statusChanged) {
                console.log('User permissions changed:', {
                  oldRole: token.role,
                  newRole: dbUser.role,
                  oldStatus: token.status,
                  newStatus: dbUser.status
                });
              }
              
              token.id = dbUser.id;
              token.email = dbUser.email;
              token.name = dbUser.username;
              token.role = dbUser.role;
              token.status = dbUser.status;
              token.lastUpdated = Date.now();
            }
          } catch (error) {
            console.error('Error refreshing user data in JWT callback:', error);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string; // JWT 토큰의 권한 사용 (이미 최신화됨)
        session.user.status = token.status as string; // 상태 정보도 추가
      }
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
  
  try {
    const response = await handler(req, context);
    
    // Error response인 경우 상세 로깅
    if (response.status >= 300) {
      
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
  return handler(req, context);
}