import { NextResponse } from 'next/server';
import { userRepository } from '@/lib/db/repository';
import { verifyPassword } from '@/lib/auth';
import { signIn } from 'next-auth/react';
import { cookies } from 'next/headers';
import { getServerTranslation, defaultLanguage, type Language } from '@/lib/i18n-server';

// Helper function to detect language from request headers
function getLanguageFromRequest(request: Request): Language {
  const acceptLanguage = request.headers.get('accept-language') || '';
  if (acceptLanguage.includes('ko')) {
    return 'kor';
  }
  if (acceptLanguage.includes('en')) {
    return 'eng';
  }
  return defaultLanguage;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const language = getLanguageFromRequest(request);

    console.log('Login API called with email:', email);

    // Validation check
    if (!email || !password) {
      const errorMessage = await getServerTranslation(language, 'auth', 'errors.credentialsRequired');
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage
        },
        { status: 400 }
      );
    }

    // User verification
    const user = await userRepository.findByEmail(email);
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      const errorMessage = await getServerTranslation(language, 'auth', 'errors.emailNotFound');
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage
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
      const errorMessage = await getServerTranslation(language, 'auth', 'errors.passwordIncorrect');
      return NextResponse.json(
        { 
          success: false,
          error: errorMessage
        },
        { status: 401 }
      );
    }

    // 로그인 successful - 모든 권한의 사용자 정보 반환 (게스트 포함)
    const message = user.role === 'guest' 
      ? await getServerTranslation(language, 'auth', 'guest.loginSuccess')
      : await getServerTranslation(language, 'auth', 'guest.sessionCreated');

    return NextResponse.json({
      success: true,
      message: message,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    const language = getLanguageFromRequest(request);
    const errorMessage = await getServerTranslation(language, 'auth', 'messages.loginError');
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
