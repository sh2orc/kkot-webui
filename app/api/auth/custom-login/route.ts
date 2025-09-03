import { NextResponse } from 'next/server';
import { userRepository } from '@/lib/db/repository';
import { verifyPassword } from '@/lib/auth';
import { createJWTToken } from '@/lib/jwt-auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('Custom login API called with email:', email);

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
    const isValidPassword = verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Incorrect password.' 
        },
        { status: 401 }
      );
    }

    // Generate MSA 호환 JWT token
    const token = await createJWTToken({
      id: user.id,
      email: user.email,
      name: user.username,
      role: user.role,
    });

    // Cookie setup
    const cookieStore = cookies();
    const url = new URL(request.url);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const isProduction = process.env.NODE_ENV === 'production';
    const shouldUseSecure = isProduction && !isLocalhost;
    
    cookieStore.set({
      name: 'next-auth.session-token',  // Always use the same name
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
      message: 'Login successful!',
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
        error: 'An error occurred during login.' 
      },
      { status: 500 }
    );
  }
}
