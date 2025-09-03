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

    // Validation check
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Please enter email and password.' 
        },
        { status: 400 }
      );
    }

    // User verification
    const user = await userRepository.findByEmail(email);
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email does not exist.' 
        },
        { status: 401 }
      );
    }

    // Password verification
    console.log('Input password:', password);
    console.log('Stored password hash length:', user.password.length);
    const isValidPassword = verifyPassword(password, user.password);
    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Incorrect password.' 
        },
        { status: 401 }
      );
    }

    // Guest 권한 체크
    if (user.role === 'guest') {
      return NextResponse.json(
        { 
          success: false,
          error: '게스트 계정은 로그인할 수 없습니다. 관리자에게 문의하여 권한을 요청하세요.' 
        },
        { status: 403 }
      );
    }

    // 로그인 successful - 사용자 정보 반환
    return NextResponse.json({
      success: true,
      message: '로그인 검증 successful! NextAuth 세션을 생성합니다...',
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
        error: '로그인 중 An error occurred.' 
      },
      { status: 500 }
    );
  }
}
