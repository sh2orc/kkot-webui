'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Image from 'next/image';
import { useTranslation, preloadTranslationModule } from '@/lib/i18n';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslationLoaded, setIsTranslationLoaded] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    email: '', 
    username: '', 
    password: '', 
    confirmPassword: '' 
  });
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, lang, language } = useTranslation('auth');

  // 번역 모듈 미리 로드
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        await preloadTranslationModule(language, 'auth');
        setIsTranslationLoaded(true);
      } catch (error) {
        console.error('Failed to load translations:', error);
        setIsTranslationLoaded(true); // 에러가 발생해도 계속 진행
      }
    };
    
    loadTranslations();
  }, [language]);

  // 이미 로그인된 경우 메인 페이지로 리다이렉트 (로딩 완료 후에만)
  useEffect(() => {
    if (status === 'authenticated' && session) {
      // 약간의 지연을 두어 무한 리다이렉트 방지
      const timer = setTimeout(() => {
        router.replace('/');
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [status, session, router]);

  // 번역 모듈과 세션 로딩 상태 표시
  if (status === 'loading' || !isTranslationLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 이미 인증된 사용자는 빈 화면 표시 (리다이렉트 중)
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">리다이렉트 중...</p>
        </div>
      </div>
    );
  }

  // 안전한 번역 함수 (기본값 제공)
  const safeTranslate = (key: string, fallback: string = key) => {
    const translated = lang(key);
    return translated === key ? fallback : translated;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: loginForm.email,
        password: loginForm.password,
        action: 'login',
        redirect: false,
      });

      if (result?.error) {
        toast.error(await t('messages.loginFailed'));
      } else if (result?.ok) {
        toast.success(await t('messages.loginSuccess'));
        // signIn이 성공하면 useSession이 자동으로 업데이트되고 useEffect에서 리다이렉트 처리
      } else {
        toast.error(await t('messages.loginGeneralError'));
      }
    } catch (error) {
      toast.error(await t('messages.loginError'));
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error(await t('messages.registerPasswordMismatch'));
      return;
    }

    if (registerForm.password.length < 6) {
      toast.error(await t('messages.registerPasswordTooShort'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerForm.email)) {
      toast.error(await t('messages.registerInvalidEmail'));
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: registerForm.email,
        password: registerForm.password,
        username: registerForm.username,
        action: 'register',
        redirect: false,
      });

      if (result?.error) {
        toast.error(await t('messages.registerFailed') + result.error);
      } else if (result?.ok) {
        toast.success(await t('messages.registerSuccess'));
        // signIn이 성공하면 useSession이 자동으로 업데이트되고 useEffect에서 리다이렉트 처리
      } else {
        toast.error(await t('messages.registerGeneralError'));
      }
    } catch (error) {
      toast.error(await t('messages.registerError'));
      console.error('Register error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center items-center">
            <Image src="/images/logo.svg" alt="KKOT WebUI" width={130} height={24} />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {safeTranslate('title', '꽃 KKOT')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {safeTranslate('subtitle', '계정에 로그인하거나 새 계정을 만드세요')}
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{safeTranslate('login.title', '로그인')}</TabsTrigger>
            <TabsTrigger value="register">{safeTranslate('register.title', '회원가입')}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>{safeTranslate('login.title', '로그인')}</CardTitle>
                <CardDescription>
                  {safeTranslate('login.description', '기존 계정으로 로그인하세요')}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{safeTranslate('form.email', '이메일')}</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={safeTranslate('form.emailPlaceholder', 'your@email.com')}
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">{safeTranslate('form.password', '비밀번호')}</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? safeTranslate('login.loading', '로그인 중...') : safeTranslate('login.button', '로그인')}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>{safeTranslate('register.title', '회원가입')}</CardTitle>
                <CardDescription>
                  {safeTranslate('register.description', '새 계정을 만드세요. 첫 번째 사용자는 자동으로 관리자가 됩니다.')}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">{safeTranslate('form.email', '이메일')}</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder={safeTranslate('form.emailPlaceholder', 'your@email.com')}
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-username">{safeTranslate('form.username', '사용자명')}</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder={safeTranslate('form.usernamePlaceholder', '사용자명')}
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">{safeTranslate('form.password', '비밀번호')}</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder={safeTranslate('form.passwordPlaceholder', '최소 6자리')}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">{safeTranslate('form.confirmPassword', '비밀번호 확인')}</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder={safeTranslate('form.confirmPasswordPlaceholder', '비밀번호 재입력')}
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? safeTranslate('register.loading', '가입 중...') : safeTranslate('register.button', '회원가입')}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 