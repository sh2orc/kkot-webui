import { NextResponse } from 'next/server';
import { userRepository } from '@/lib/db/repository';
import { verifyPassword } from '@/lib/auth';
import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('Custom login API called with email:', email);

    // 유효성 검사
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: '이메일과 비밀번호를 입력해주세요.' 
        },
        { status: 400 }
      );
    }

    // 사용자 확인
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: '존재하지 않는 이메일입니다.' 
        },
        { status: 401 }
      );
    }

    // 비밀번호 확인
    const isValidPassword = verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          success: false,
          error: '비밀번호가 올바르지 않습니다.' 
        },
        { status: 401 }
      );
    }

    // JWT 토큰 생성
    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.role,
      },
      secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // 쿠키 설정
    const cookieStore = cookies();
    const url = new URL(request.url);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const isProduction = process.env.NODE_ENV === 'production';
    const shouldUseSecure = isProduction && !isLocalhost;
    
    cookieStore.set({
      name: 'next-auth.session-token',  // 항상 동일한 이름 사용
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecure,
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    console.log('Session token created and set');

    return NextResponse.json({
      success: true,
      message: '로그인 성공!',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Custom login error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '로그인 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}
