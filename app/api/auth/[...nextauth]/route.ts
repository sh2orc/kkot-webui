import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { userRepository } from '@/lib/db/repository';
import { hashPassword, verifyPassword, generateUserId } from '@/lib/auth';
import { getServerTranslation, defaultLanguage, type Language } from '@/lib/i18n-server';

export const authOptions = {
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
        try {
          // Use language from credentials or default to Korean
          const language = (credentials?.language as Language) || defaultLanguage;
          
          if (!credentials?.email || !credentials?.password) {
            const errorMessage = await getServerTranslation(language, 'auth', 'errors.credentialsRequired');
            throw new Error(errorMessage);
          }

          const email = credentials.email as string;
          const password = credentials.password as string;
          const username = credentials.username as string;
          const action = credentials.action as string;

          if (action === 'register') {
            // Handle registration
            // Check for existing user
            const existingUser = await userRepository.findByEmail(email);
            
            if (existingUser) {
              const errorMessage = await getServerTranslation(language, 'auth', 'errors.emailAlreadyExists');
              throw new Error(errorMessage);
            }

            // Check total user count (to determine if this is the first user)
            const allUsers = await userRepository.findAll();
            const isFirstUser = allUsers.length === 0;

            // Create user
            const hashedPassword = hashPassword(password);
            const userRole = isFirstUser ? 'admin' : 'user';

            const [newUser] = await userRepository.create({
              username: username || email.split('@')[0], // Username or extracted from email
              email,
              password: hashedPassword,
              role: userRole
            });

            return {
              id: newUser.id,
              email: newUser.email,
              name: newUser.username,
              role: newUser.role
            };
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

            return {
              id: user.id,
              email: user.email,
              name: user.username,
              role: user.role
            };
          }
        } catch (error) {
          console.error('Auth error:', error);
          throw error; // Pass error to higher level for client-side handling
        }
      }
    })
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 