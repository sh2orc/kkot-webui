import { NextResponse } from 'next/server';
import { userRepository, adminSettingsRepository, groupRepository } from '@/lib/db/repository';
import { hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, username } = body;

    // Validation check
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Please enter email and password.' },
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

    // Check 기존 사용자
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: '이미 존재하는 이메일입니다.' },
        { status: 409 }
      );
    }

    // Check if first user
    const allUsers = await userRepository.findAll();
    const isFirstUser = allUsers.length === 0;

    // Check signup enabled setting
    const signupEnabledSetting = await adminSettingsRepository.findByKey('auth.signupEnabled');
    const signupEnabled = signupEnabledSetting?.[0]?.value === 'true';

    // Create 사용자
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

    // Add user to appropriate group based on role
    try {
      if (userRole === 'admin') {
        // Add admin users to admin group
        const adminGroup = await groupRepository.findByName('admin');
        if (adminGroup) {
          await groupRepository.addUser(adminGroup.id, newUser.id);
          console.log(`Added admin user ${newUser.email} to admin group`);
        } else {
          console.log('Admin group not found, creating one...');
          // Create admin group if it doesn't exist
          const [createdGroup] = await groupRepository.create({
            id: 'admin',
            name: 'Administrator',
            description: 'System administrators with full access',
            isSystem: true,
            isActive: true
          });
          await groupRepository.addUser(createdGroup.id, newUser.id);
          console.log(`Created admin group and added user ${newUser.email}`);
        }
      } else if (userRole === 'user') {
        // Add regular users to default group
        const defaultGroup = await groupRepository.findById('default');
        if (defaultGroup) {
          console.log(`Adding user ${newUser.id} to default group ${defaultGroup.id}...`);
          const result = await groupRepository.addUser(defaultGroup.id, newUser.id);
          console.log('AddUser result:', result);
          console.log(`Added user ${newUser.email} to default group`);
        } else {
          console.log('Default group not found, creating one...');
          // Create default group if it doesn't exist
          const [createdGroup] = await groupRepository.create({
            id: 'default',
            name: 'Default User',
            description: 'Default group for all users',
            isSystem: true,
            isActive: true
          });
          await groupRepository.addUser(createdGroup.id, newUser.id);
          console.log(`Created default group and added user ${newUser.email}`);
        }
      }
    } catch (error) {
      console.error('Failed to add user to group:', error);
      // Don't fail the registration if group assignment fails
    }

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
      { error: '회원가입 중 An error occurred.' },
      { status: 500 }
    );
  }
}
