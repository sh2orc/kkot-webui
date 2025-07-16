import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db/config';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
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
          // Use default language for now (Korean)
          const language = defaultLanguage;
          
          if (!credentials?.email || !credentials?.password) {
            const errorMessage = await getServerTranslation(language, 'auth', 'errors.credentialsRequired');
            throw new Error(errorMessage);
          }

          const db = getDb();
          const email = credentials.email as string;
          const password = credentials.password as string;
          const username = credentials.username as string;
          const action = credentials.action as string;

          if (action === 'register') {
            // Handle registration
            // Check for existing user
            const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
            
            if (existingUser.length > 0) {
              const errorMessage = await getServerTranslation(language, 'auth', 'errors.emailAlreadyExists');
              throw new Error(errorMessage);
            }

            // Check total user count (to determine if this is the first user)
            const allUsers = await db.select().from(users);
            const isFirstUser = allUsers.length === 0;

            // Create user
            const userId = generateUserId();
            const hashedPassword = hashPassword(password);
            const userRole = isFirstUser ? 'admin' : 'user';

            await db.insert(users).values({
              id: userId,
              username: username || email.split('@')[0], // Username or extracted from email
              email,
              password: hashedPassword,
              role: userRole,
              createdAt: new Date(),
              updatedAt: new Date()
            });

            return {
              id: userId,
              email,
              name: username || email.split('@')[0],
              role: userRole
            };
          } else {
            // Handle login
            const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
            
            if (user.length === 0) {
              const errorMessage = await getServerTranslation(language, 'auth', 'errors.emailNotFound');
              throw new Error(errorMessage);
            }

            const isValidPassword = verifyPassword(password, user[0].password);
            
            if (!isValidPassword) {
              const errorMessage = await getServerTranslation(language, 'auth', 'errors.passwordIncorrect');
              throw new Error(errorMessage);
            }

            return {
              id: user[0].id,
              email: user[0].email,
              name: user[0].username,
              role: user[0].role
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