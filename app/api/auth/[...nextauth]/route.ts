import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getDb } from '@/lib/db/config';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateUserId } from '@/lib/auth';

const handler = NextAuth({
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
            return null;
          }

          const db = getDb();
          const email = credentials.email as string;
          const password = credentials.password as string;
          const username = credentials.username as string;
          const action = credentials.action as string;

          if (action === 'register') {
            // 회원가입 처리
            // 기존 사용자 확인
            const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
            
            if (existingUser.length > 0) {
              throw new Error('이미 존재하는 이메일입니다.');
            }

            // 전체 사용자 수 확인 (첫 번째 사용자인지 확인)
            const allUsers = await db.select().from(users);
            const isFirstUser = allUsers.length === 0;

            // 사용자 생성
            const userId = generateUserId();
            const hashedPassword = hashPassword(password);
            const userRole = isFirstUser ? 'admin' : 'user';

            await db.insert(users).values({
              id: userId,
              username: username || email.split('@')[0], // 사용자명 또는 이메일에서 추출
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
            // 로그인 처리
            const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
            
            if (user.length === 0) {
              return null;
            }

            const isValidPassword = verifyPassword(password, user[0].password);
            
            if (!isValidPassword) {
              return null;
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
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 24 * 60 * 60, // 24시간
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24시간
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
});

export { handler as GET, handler as POST }; 