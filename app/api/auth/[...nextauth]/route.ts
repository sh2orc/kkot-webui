import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db/config';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateUserId } from '@/lib/auth';

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        username: { label: 'Username', type: 'text' },
        action: { label: 'Action', type: 'text' } // login or register
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Please enter both email and password.');
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
              throw new Error('Email already exists.');
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
              throw new Error('Email does not exist.');
            }

            const isValidPassword = verifyPassword(password, user[0].password);
            
            if (!isValidPassword) {
              throw new Error('Password is incorrect.');
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