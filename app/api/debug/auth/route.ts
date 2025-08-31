import { NextResponse } from 'next/server';

export async function GET() {
  // 환경변수 디버깅 정보 (민감한 정보는 일부만 표시)
  const debugInfo = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET (hidden)' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET (hidden)' : 'NOT SET',
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? 'SET (hidden)' : 'NOT SET',
  };

  return NextResponse.json(debugInfo);
}
