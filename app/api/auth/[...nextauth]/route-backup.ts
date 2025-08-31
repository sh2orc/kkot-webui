import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { KakaoProvider } from '@/lib/oauth-providers';
import { NaverProvider } from '@/lib/oauth-providers';
import { userRepository } from '@/lib/db/repository';
import { hashPassword, verifyPassword, generateUserId } from '@/lib/auth';
import { getServerTranslation, defaultLanguage, type Language } from '@/lib/i18n-server';
import { getOAuthConfig } from '@/lib/oauth-config';

// NextAuth 설정을 동적으로 생성하는 함수
async function createAuthOptions(): Promise<NextAuthOptions> {
  const oauthConfig = await getOAuthConfig();
  
  return {
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
    providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        username: { label: 'Username', type: 'text' },
        action: { label: 'Action', type: 'text' }, // login or register
        language: { label: 'Language', type: 'text' } // language setting
      },
      async authorize(credentials) {
        console.log('Authorize called with:', { email: credentials?.email, action: credentials?.action });
        try {
          // Use language from credentials or default to Korean
          const language = (credentials?.language as Language) || defaultLanguage;
          
          if (!credentials?.email || !credentials?.password) {
            const errorMessage = await getServerTranslation(language, 'auth', 'errors.credentialsRequired');
            console.log('Missing credentials, error:', errorMessage);
            throw new Error(errorMessage);
          }

          const email = credentials.email as string;
          const password = credentials.password as string;
          const username = credentials.username as string;
          const action = credentials.action as string;

          if (action === 'register') {
            console.log('Starting registration for:', email);
            // Handle registration
            // Check for existing user
            const existingUser = await userRepository.findByEmail(email);
            console.log('Existing user check:', existingUser);
            
            if (existingUser) {
              const errorMessage = await getServerTranslation(language, 'auth', 'errors.emailAlreadyExists');
              console.log('User already exists, throwing error:', errorMessage);
              throw new Error(errorMessage);
            }

            // Check total user count (to determine if this is the first user)
            const allUsers = await userRepository.findAll();
            const isFirstUser = allUsers.length === 0;

            // Create user
            const hashedPassword = hashPassword(password);
            const userRole = isFirstUser ? 'admin' : 'user';

            let newUser;
            try {
              const result = await userRepository.create({
                username: username || email.split('@')[0], // Username or extracted from email
                email,
                password: hashedPassword,
                role: userRole
              });
              newUser = result[0];
              console.log('User created successfully:', newUser);
            } catch (createError) {
              console.error('Error creating user:', createError);
              throw createError;
            }

            const userObject = {
              id: String(newUser.id),
              email: newUser.email,
              name: newUser.username,
              role: newUser.role
            };
            console.log('Returning new user object:', userObject);
            return userObject;
          } else {
            // Handle login
            const user = await userRepository.findByEmail(email);
            
            if (!user) {
              const errorMessage = await getServerTranslation(language, 'auth', 'errors.emailNotFound');
              throw new Error(errorMessage);
            }

            const isValidPassword = verifyPassword(password, user.password);
            
            if (!isValidPassword) {
              const errorMessage = await getServerTranslation(language, 'auth', 'errors.passwordIncorrect');
              throw new Error(errorMessage);
            }

            const userObject = {
              id: String(user.id),
              email: user.email,
              name: user.username,
              role: user.role
            };
            console.log('Returning login user object:', userObject);
            return userObject;
          }
        } catch (error: any) {
          console.error('Auth error:', error);
          // NextAuth expects a string error message
          throw new Error(error.message || 'Authentication failed');
        }
      }
      }),
      // Google OAuth - DB 설정에서 활성화된 경우
      ...(oauthConfig.google ? [
        GoogleProvider({
          clientId: oauthConfig.google.clientId,
          clientSecret: oauthConfig.google.clientSecret,
          authorization: {
            params: {
              prompt: "consent",
              access_type: "offline",
              response_type: "code"
            }
          }
        })
      ] : []),
      // GitHub OAuth - DB 설정에서 활성화된 경우
      ...(oauthConfig.github ? [
        GitHubProvider({
          clientId: oauthConfig.github.clientId,
          clientSecret: oauthConfig.github.clientSecret,
        })
            ] : []),
      // Microsoft OAuth - DB 설정에서 활성화된 경우
      ...(oauthConfig.microsoft ? [
        AzureADProvider({
          clientId: oauthConfig.microsoft.clientId,
          clientSecret: oauthConfig.microsoft.clientSecret,
          tenantId: oauthConfig.microsoft.tenantId || 'common',
        })
      ] : []),
      // Kakao OAuth - DB 설정에서 활성화된 경우
      ...(oauthConfig.kakao ? [
        KakaoProvider({
          clientId: oauthConfig.kakao.clientId,
          clientSecret: oauthConfig.kakao.clientSecret,
        })
      ] : []),
      // Naver OAuth - DB 설정에서 활성화된 경우
      ...(oauthConfig.naver ? [
        NaverProvider({
          clientId: oauthConfig.naver.clientId,
          clientSecret: oauthConfig.naver.clientSecret,
        })
      ] : []),
    ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }: any) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    },
    async signIn({ user, account, profile }: any) {
      console.log('SignIn callback called:', { user, account });
      // OAuth 로그인 처리
      if (account?.provider !== 'credentials' && user?.email) {
        try {
          // 기존 사용자 확인
          const existingUser = await userRepository.findByEmail(user.email);
          
          if (existingUser) {
            // 기존 사용자가 있으면 해당 사용자 정보로 로그인
            user.id = existingUser.id;
            user.role = existingUser.role;
            user.name = existingUser.username;
            return true;
          } else {
            // 새 사용자 생성
            const allUsers = await userRepository.findAll();
            const isFirstUser = allUsers.length === 0;
            const userRole = isFirstUser ? 'admin' : 'user';
            
            const [newUser] = await userRepository.create({
              username: user.name || user.email.split('@')[0],
              email: user.email,
              password: hashPassword(generateUserId()), // 임시 패스워드
              role: userRole
            });
            
            user.id = newUser.id;
            user.role = newUser.role;
            user.name = newUser.username;
            return true;
          }
        } catch (error) {
          console.error('OAuth sign-in error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }: any) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
      }
    },
    pages: {
      signIn: '/auth',
      error: '/auth'
    },
    debug: process.env.NODE_ENV === 'development',
  };
}

// NextAuth 핸들러 생성 및 export
let authOptionsCache: NextAuthOptions | null = null;

export async function getAuthOptions(): Promise<NextAuthOptions> {
  if (!authOptionsCache) {
    authOptionsCache = await createAuthOptions();
  }
  return authOptionsCache;
}

// NextAuth handler
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };