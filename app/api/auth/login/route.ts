import { NextResponse } from 'next/server';
import { userRepository } from '@/lib/db/repository';
import { verifyPassword } from '@/lib/auth';
import { signIn } from 'next-auth/react';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('Login API called with email:', email);

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
    console.log('User found:', user ? 'Yes' : 'No');
    
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
    console.log('Input password:', password);
    console.log('Stored password hash length:', user.password.length);
    const isValidPassword = verifyPassword(password, user.password);
    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          success: false,
          error: '비밀번호가 올바르지 않습니다.' 
        },
        { status: 401 }
      );
    }

    // 로그인 성공 - 사용자 정보 반환
    return NextResponse.json({
      success: true,
      message: '로그인 검증 성공! NextAuth 세션을 생성합니다...',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '로그인 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}
