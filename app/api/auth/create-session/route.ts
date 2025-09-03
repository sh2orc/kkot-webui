import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 이 API는 클라이언트에서 NextAuth signIn을 사용하도록 안내만 합니다
    return NextResponse.json({
      success: true,
      message: 'Please use NextAuth signIn on client side',
      credentials: {
        email,
        action: 'login'
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '세션 생성 중 An error occurred.' 
      },
      { status: 500 }
    );
  }
}
