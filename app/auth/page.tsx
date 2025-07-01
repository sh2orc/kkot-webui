'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n';
import Loading from '@/components/ui/loading';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    email: '', 
    username: '', 
    password: '', 
    confirmPassword: '' 
  });
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, lang } = useTranslation('auth');

  // Debug logging (simplified)
  useEffect(() => {
    console.log('Auth Page - Session Status:', status);
  }, [status]);

  // Redirect to chat page if already logged in (once only)
  useEffect(() => {
    if (status === 'authenticated' && session) {
      console.log('Redirecting to /chat...');
      router.replace('/chat');
    }
  }, [status, session]); // router removed from dependencies

  // Show loading while session is loading
  if (status === 'loading') {
    return <Loading />;
  }

  // Show loading for authenticated users during redirect
  if (status === 'authenticated') {
    return <Loading text="Entering KKOT..." />;
  }

  // Safe translation function (with fallback)
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
            {safeTranslate('title', 'KKOT WebUI')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {safeTranslate('subtitle', 'Sign in to your account or create a new one')}
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{safeTranslate('login.title', 'Login')}</TabsTrigger>
            <TabsTrigger value="register">{safeTranslate('register.title', 'Register')}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>{safeTranslate('login.title', 'Login')}</CardTitle>
                <CardDescription>
                  {safeTranslate('login.description', 'Sign in to your existing account')}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">{safeTranslate('form.email', 'Email')}</Label>
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
                    <Label htmlFor="login-password">{safeTranslate('form.password', 'Password')}</Label>
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
                    {isLoading ? safeTranslate('login.loading', 'Signing in...') : safeTranslate('login.button', 'Sign In')}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>{safeTranslate('register.title', 'Register')}</CardTitle>
                <CardDescription>
                  {safeTranslate('register.description', 'Create a new account. The first user will automatically become an administrator.')}
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">{safeTranslate('form.email', 'Email')}</Label>
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
                    <Label htmlFor="register-username">{safeTranslate('form.username', 'Username')}</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder={safeTranslate('form.usernamePlaceholder', 'Username')}
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">{safeTranslate('form.password', 'Password')}</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder={safeTranslate('form.passwordPlaceholder', 'At least 6 characters')}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">{safeTranslate('form.confirmPassword', 'Confirm Password')}</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder={safeTranslate('form.confirmPasswordPlaceholder', 'Re-enter password')}
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? safeTranslate('register.loading', 'Registering...') : safeTranslate('register.button', 'Register')}
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