import { NextRequest, NextResponse } from 'next/server';
import { userRepository, adminSettingsRepository, groupRepository } from '@/lib/db/repository';
import { hashPassword } from '@/lib/auth';
import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { getOAuthData, deleteOAuthData } from '@/lib/oauth-temp-storage';
import sharp from 'sharp';

// Function to download Google profile picture and convert to base64
async function downloadGoogleProfilePicture(pictureUrl: string): Promise<string | null> {
  try {

    
    // Download Google profile picture
    const response = await fetch(pictureUrl);
    if (!response.ok) {
      console.error('🖼️ Failed to download profile picture:', response.status);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Resize image (max 300x300px)
    const resizedBuffer = await sharp(buffer)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    // Convert to Base64
    const base64 = resizedBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    

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
    const token = url.searchParams.get('token'); // Also support legacy token method

    let oauthData;

    // New method: Base64 encoded data
    if (encodedData) {
      try {
        const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');
        oauthData = JSON.parse(decodedData);

      } catch (decodeError) {
        console.error('🚀 Failed to decode OAuth data:', decodeError);
        return NextResponse.json({ error: 'Invalid OAuth data.' }, { status: 400 });
      }
    }
    // Legacy method: Token-based temporary storage
    else if (token) {

      oauthData = getOAuthData(token);
      if (!oauthData) {
        return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 400 });
      }
    }
    else {
      return NextResponse.json({ error: 'OAuth data or token is required.' }, { status: 400 });
    }

    // Check existing account
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
          return NextResponse.json({ error: 'A server error occurred.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, data, action } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required.' }, { status: 400 });
    }

    let oauthData;

    // New method: Base64 encoded data
    if (data) {
      try {
        const decodedData = Buffer.from(data, 'base64').toString('utf-8');
        oauthData = JSON.parse(decodedData);

      } catch (decodeError) {
        console.error('🚀 Failed to decode OAuth data:', decodeError);
        return NextResponse.json({ error: 'Invalid OAuth data.' }, { status: 400 });
      }
    }
    // Legacy method: Token-based
    else if (token) {

      oauthData = getOAuthData(token);
      if (!oauthData) {
        return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 400 });
      }
    }
    else {
      return NextResponse.json({ error: 'OAuth data or token is required.' }, { status: 400 });
    }

    let user;

    if (action === 'link') {
      // Link with existing account
      const existingUser = await userRepository.findByEmail(oauthData.email);
      if (!existingUser) {
        return NextResponse.json({ error: '연동할 기존 계정을 not found.' }, { status: 404 });
      }

      // Update OAuth information
      const updateData: any = {
        oauthProvider: oauthData.provider,
        oauthLinkedAt: new Date(),
        oauthProfilePicture: oauthData.picture,
      };
      
      // Add googleId field only for Google OAuth
      if (oauthData.provider === 'google') {
        updateData.googleId = oauthData.id;
        
        // Download and save Google profile picture
        if (oauthData.picture) {
          const profileImageDataUrl = await downloadGoogleProfilePicture(oauthData.picture);
          if (profileImageDataUrl) {
            updateData.profileImage = profileImageDataUrl;

          }
        }
      }
      
      const updatedUsers = await userRepository.update(existingUser.id, updateData);

      user = updatedUsers[0];

      
      // Fetch latest user information from DB (including permissions)
      const refreshedUser = await userRepository.findByEmail(user.email);
      if (refreshedUser) {
        user = refreshedUser;

      }

    } else if (action === 'create') {
      // Check signup enabled setting
      const signupEnabledSetting = await adminSettingsRepository.findByKey('auth.signupEnabled');
      const signupEnabled = signupEnabledSetting?.[0]?.value === 'true';
      
      // Check if first user
      const allUsers = await userRepository.findAll();
      const isFirstUser = allUsers.length === 0;
      
      // Determine permissions
      let userRole = 'user';
      if (isFirstUser) {
        userRole = 'admin';
      } else if (!signupEnabled) {
        userRole = 'guest';
      }
      
      // Create new account
      const newUsers = await userRepository.create({
        email: oauthData.email,
        username: oauthData.name || oauthData.email.split('@')[0],
        password: await hashPassword(Math.random().toString(36).slice(-8)), // Random password
        role: userRole,
      });

      if (!newUsers || newUsers.length === 0) {
        return NextResponse.json({ error: 'Account creation failed.' }, { status: 500 });
      }

      user = newUsers[0];

      // Update OAuth information
      const updateData: any = {
        oauthProvider: oauthData.provider,
        oauthLinkedAt: new Date(),
        oauthProfilePicture: oauthData.picture,
      };
      
      // Add googleId field only for Google OAuth
      if (oauthData.provider === 'google') {
        updateData.googleId = oauthData.id;
        
        // Download and save Google profile picture
        if (oauthData.picture) {
          const profileImageDataUrl = await downloadGoogleProfilePicture(oauthData.picture);
          if (profileImageDataUrl) {
            updateData.profileImage = profileImageDataUrl;

          }
        }
      }
      
      const updatedUsers = await userRepository.update(user.id, updateData);

      user = updatedUsers[0];

      // If user is admin, add to admin group
      if (userRole === 'admin') {
        try {
          const adminGroup = await groupRepository.findByName('admin');
          if (adminGroup) {
            await groupRepository.addUser(adminGroup.id, user.id, 'system');

          } else {

            // Create admin group if it doesn't exist
            const [createdGroup] = await groupRepository.create({
              name: 'admin',
              description: 'System administrators with full access',
              isSystem: true,
              isActive: true
            });
            await groupRepository.addUser(createdGroup.id, user.id, 'system');
            console.log(`Created admin group and added OAuth user ${user.email}`);
          }
        } catch (error) {
          console.error('Failed to add OAuth user to admin group:', error);
          // Don't fail the registration if group assignment fails
        }
      }
      
      // Fetch latest user information from DB (including permissions)
      const refreshedUser = await userRepository.findByEmail(user.email);
      if (refreshedUser) {
        user = refreshedUser;

      }

    } else {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    // Check guest permissions
    if (user.role === 'guest') {
      return NextResponse.json({ 
        success: false,
        error: 'Account was created but set with guest permissions.',
        message: 'Please contact administrator to request permissions for login.'
      }, { status: 403 });
    }

    // Update last login time
    await userRepository.updateLastLogin(user.id);
    console.log('🚀 Updated last login time for linked account:', user.id);

    // Generate NextAuth JWT token
    const secret = process.env.NEXTAUTH_SECRET;
    const maxAge = 30 * 24 * 60 * 60; // 30 days

    const jwtToken = await encode({
      token: {
        sub: user.id.toString(),
        id: user.id.toString(), // id field used in NextAuth callback
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

    // Set session cookie
    const response = NextResponse.json({ success: true });
    
    // Set cookies directly in response headers
    const url = new URL(request.url);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    response.cookies.set('next-auth.session-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && !isLocalhost,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    // Clean up temporary data
    // Delete legacy token if exists
    if (token) {
      deleteOAuthData(token);
    }

    console.log('🚀 Account linking completed, session created');
    return response;

  } catch (error) {
    console.error('Link account POST error:', error);
    return NextResponse.json({ error: 'A server error occurred.' }, { status: 500 });
  }
}


