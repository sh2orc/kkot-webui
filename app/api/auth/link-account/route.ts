import { NextRequest, NextResponse } from 'next/server';
import { userRepository, adminSettingsRepository } from '@/lib/db/repository';
import { hashPassword } from '@/lib/auth';
import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { getOAuthData, deleteOAuthData } from '@/lib/oauth-temp-storage';
import sharp from 'sharp';

// 구글 프로필 사진을 다운로드하고 base64로 변환하는 함수
async function downloadGoogleProfilePicture(pictureUrl: string): Promise<string | null> {
  try {
    console.log('🖼️ Downloading Google profile picture from:', pictureUrl);
    
    // 구글 프로필 사진 다운로드
    const response = await fetch(pictureUrl);
    if (!response.ok) {
      console.error('🖼️ Failed to download profile picture:', response.status);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 이미지 리사이즈 (최대 300x300px)
    const resizedBuffer = await sharp(buffer)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    // Base64로 변환
    const base64 = resizedBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    
    console.log('🖼️ Profile picture downloaded and converted successfully');
    return dataUrl;
  } catch (error) {
    console.error('🖼️ Error downloading profile picture:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const encodedData = url.searchParams.get('data');
    const token = url.searchParams.get('token'); // 기존 토큰 방식도 지원

    let oauthData;

    // 새로운 방식: Base64 인코딩된 데이터
    if (encodedData) {
      try {
        const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');
        oauthData = JSON.parse(decodedData);
        console.log('🚀 OAuth data decoded from URL parameter');
      } catch (decodeError) {
        console.error('🚀 Failed to decode OAuth data:', decodeError);
        return NextResponse.json({ error: '잘못된 OAuth 데이터입니다.' }, { status: 400 });
      }
    }
    // 기존 방식: 토큰 기반 임시 저장소
    else if (token) {
      console.log('🚀 Using legacy token-based OAuth data');
      oauthData = getOAuthData(token);
      if (!oauthData) {
        return NextResponse.json({ error: '유효하지 않거나 만료된 토큰입니다.' }, { status: 400 });
      }
    }
    else {
      return NextResponse.json({ error: 'OAuth 데이터 또는 토큰이 필요합니다.' }, { status: 400 });
    }

    // 기존 계정 확인
    const existingUser = await userRepository.findByEmail(oauthData.email);

    return NextResponse.json({
      oauthData,
      existingUser: existingUser ? {
        id: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        role: existingUser.role,
      } : null,
    });
  } catch (error) {
    console.error('Link account GET error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, data, action } = await request.json();

    if (!action) {
      return NextResponse.json({ error: '액션이 필요합니다.' }, { status: 400 });
    }

    let oauthData;

    // 새로운 방식: Base64 인코딩된 데이터
    if (data) {
      try {
        const decodedData = Buffer.from(data, 'base64').toString('utf-8');
        oauthData = JSON.parse(decodedData);
        console.log('🚀 OAuth data decoded from POST body');
      } catch (decodeError) {
        console.error('🚀 Failed to decode OAuth data:', decodeError);
        return NextResponse.json({ error: '잘못된 OAuth 데이터입니다.' }, { status: 400 });
      }
    }
    // 기존 방식: 토큰 기반
    else if (token) {
      console.log('🚀 Using legacy token-based OAuth data');
      oauthData = getOAuthData(token);
      if (!oauthData) {
        return NextResponse.json({ error: '유효하지 않거나 만료된 토큰입니다.' }, { status: 400 });
      }
    }
    else {
      return NextResponse.json({ error: 'OAuth 데이터 또는 토큰이 필요합니다.' }, { status: 400 });
    }

    let user;

    if (action === 'link') {
      // 기존 계정과 연동
      const existingUser = await userRepository.findByEmail(oauthData.email);
      if (!existingUser) {
        return NextResponse.json({ error: '연동할 기존 계정을 찾을 수 없습니다.' }, { status: 404 });
      }

      // OAuth 정보 업데이트
      const updateData: any = {
        oauthProvider: oauthData.provider,
        oauthLinkedAt: new Date(),
        oauthProfilePicture: oauthData.picture,
      };
      
      // Google OAuth의 경우에만 googleId 필드 추가
      if (oauthData.provider === 'google') {
        updateData.googleId = oauthData.id;
        
        // 구글 프로필 사진 다운로드 및 저장
        if (oauthData.picture) {
          const profileImageDataUrl = await downloadGoogleProfilePicture(oauthData.picture);
          if (profileImageDataUrl) {
            updateData.profileImage = profileImageDataUrl;
            console.log('🖼️ Updated user profile image with Google photo');
          }
        }
      }
      
      const updatedUsers = await userRepository.update(existingUser.id, updateData);

      user = updatedUsers[0];
      console.log('🚀 Account linked successfully:', user.email);
      
      // DB에서 최신 사용자 정보 다시 가져오기 (권한 포함)
      const refreshedUser = await userRepository.findByEmail(user.email);
      if (refreshedUser) {
        user = refreshedUser;
        console.log('🚀 User data refreshed with latest permissions:', { id: user.id, role: user.role });
      }

    } else if (action === 'create') {
      // 회원가입 활성화 설정 확인
      const signupEnabledSetting = await adminSettingsRepository.findByKey('auth.signupEnabled');
      const signupEnabled = signupEnabledSetting?.[0]?.value === 'true';
      
      // 첫 번째 사용자인지 확인
      const allUsers = await userRepository.findAll();
      const isFirstUser = allUsers.length === 0;
      
      // 권한 결정
      let userRole = 'user';
      if (isFirstUser) {
        userRole = 'admin';
      } else if (!signupEnabled) {
        userRole = 'guest';
      }
      
      // 새 계정 생성
      const newUsers = await userRepository.create({
        email: oauthData.email,
        username: oauthData.name || oauthData.email.split('@')[0],
        password: await hashPassword(Math.random().toString(36).slice(-8)), // 랜덤 비밀번호
        role: userRole,
      });

      if (!newUsers || newUsers.length === 0) {
        return NextResponse.json({ error: '계정 생성에 실패했습니다.' }, { status: 500 });
      }

      user = newUsers[0];

      // OAuth 정보 업데이트
      const updateData: any = {
        oauthProvider: oauthData.provider,
        oauthLinkedAt: new Date(),
        oauthProfilePicture: oauthData.picture,
      };
      
      // Google OAuth의 경우에만 googleId 필드 추가
      if (oauthData.provider === 'google') {
        updateData.googleId = oauthData.id;
        
        // 구글 프로필 사진 다운로드 및 저장
        if (oauthData.picture) {
          const profileImageDataUrl = await downloadGoogleProfilePicture(oauthData.picture);
          if (profileImageDataUrl) {
            updateData.profileImage = profileImageDataUrl;
            console.log('🖼️ Updated new user profile image with Google photo');
          }
        }
      }
      
      const updatedUsers = await userRepository.update(user.id, updateData);

      user = updatedUsers[0];
      console.log('🚀 New account created with OAuth:', user.email);
      
      // DB에서 최신 사용자 정보 다시 가져오기 (권한 포함)
      const refreshedUser = await userRepository.findByEmail(user.email);
      if (refreshedUser) {
        user = refreshedUser;
        console.log('🚀 User data refreshed with latest permissions:', { id: user.id, role: user.role });
      }

    } else {
      return NextResponse.json({ error: '유효하지 않은 액션입니다.' }, { status: 400 });
    }

    // Guest 권한 체크
    if (user.role === 'guest') {
      return NextResponse.json({ 
        success: false,
        error: '계정이 생성되었지만 게스트 권한으로 설정되었습니다.',
        message: '로그인하려면 관리자에게 문의하여 권한을 요청하세요.'
      }, { status: 403 });
    }

    // Update last login time
    await userRepository.updateLastLogin(user.id);
    console.log('🚀 Updated last login time for linked account:', user.id);

    // NextAuth JWT 토큰 생성
    const secret = process.env.NEXTAUTH_SECRET;
    const maxAge = 30 * 24 * 60 * 60; // 30일

    const jwtToken = await encode({
      token: {
        sub: user.id.toString(),
        id: user.id.toString(), // NextAuth 콜백에서 사용하는 id 필드
        email: user.email,
        name: user.username,
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + maxAge,
      },
      secret: secret!,
      maxAge,
    });

    console.log('🚀 NextAuth JWT token created for linked account:', !!jwtToken);

    // 세션 쿠키 설정
    const response = NextResponse.json({ success: true });
    
    // 쿠키를 응답 헤더에 직접 설정
    const url = new URL(request.url);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    response.cookies.set('next-auth.session-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && !isLocalhost,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    // 임시 데이터 정리
    // 기존 방식의 토큰이 있으면 삭제
    if (token) {
      deleteOAuthData(token);
    }

    console.log('🚀 Account linking completed, session created');
    return response;

  } catch (error) {
    console.error('Link account POST error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}


