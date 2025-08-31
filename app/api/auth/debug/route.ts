import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { cookies } from 'next/headers';

export async function GET() {
  const session = await getServerSession(authOptions);
  const cookieStore = cookies();
  
  const sessionToken = cookieStore.get('next-auth.session-token')?.value ||
                      cookieStore.get('__Secure-next-auth.session-token')?.value;
  
  return NextResponse.json({
    session,
    hasSessionCookie: !!sessionToken,
    cookies: cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value })),
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    }
  });
}
