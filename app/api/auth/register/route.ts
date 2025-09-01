import { NextResponse } from 'next/server';
import { userRepository, adminSettingsRepository } from '@/lib/db/repository';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, username } = body;

    // 유효성 검사
    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자리 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 기존 사용자 확인
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: '이미 존재하는 이메일입니다.' },
        { status: 409 }
      );
    }

    // 첫 번째 사용자인지 확인
    const allUsers = await userRepository.findAll();
    const isFirstUser = allUsers.length === 0;

    // 회원가입 활성화 설정 확인
    const signupEnabledSetting = await adminSettingsRepository.findByKey('auth.signupEnabled');
    const signupEnabled = signupEnabledSetting?.[0]?.value === 'true';

    // 사용자 생성
    const hashedPassword = hashPassword(password);
    
    // 첫 번째 사용자는 항상 admin, 그 외에는 signupEnabled 설정에 따라 결정
    let userRole = 'user';
    if (isFirstUser) {
      userRole = 'admin';
    } else if (!signupEnabled) {
      userRole = 'guest'; // 회원가입이 비활성화되어 있으면 guest 권한
    }

    const [newUser] = await userRepository.create({
      username: username || email.split('@')[0],
      email,
      password: hashedPassword,
      role: userRole
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role
      },
      message: newUser.role === 'guest' 
        ? '계정이 생성되었습니다. 로그인하려면 관리자에게 문의하여 권한을 요청하세요.' 
        : '회원가입이 완료되었습니다.'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
