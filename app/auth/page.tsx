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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    email: '', 
    username: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
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
    setLoginError(''); // Reset error message

    try {
      const result = await signIn('credentials', {
        email: loginForm.email,
        password: loginForm.password,
        action: 'login',
        redirect: false,
      });

      if (result?.error) {
        // Use server error message if available, otherwise use default message
        const errorMessage = result.error || await t('messages.loginFailed');
        setLoginError(errorMessage);
        toast.error(errorMessage);
      } else if (result?.ok) {
        toast.success(await t('messages.loginSuccess'));
        // signIn success will automatically update useSession and redirect in useEffect
      } else {
        const errorMessage = await t('messages.loginGeneralError');
        setLoginError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = await t('messages.loginError');
      setLoginError(errorMessage);
      toast.error(errorMessage);
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(''); // Reset error message
    
    if (registerForm.password !== registerForm.confirmPassword) {
      const errorMessage = await t('messages.registerPasswordMismatch');
      setRegisterError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    if (registerForm.password.length < 6) {
      const errorMessage = await t('messages.registerPasswordTooShort');
      setRegisterError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerForm.email)) {
      const errorMessage = await t('messages.registerInvalidEmail');
      setRegisterError(errorMessage);
      toast.error(errorMessage);
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
        // Use server error message if available, otherwise append to default message
        const errorMessage = result.error || await t('messages.registerFailed');
        setRegisterError(errorMessage);
        toast.error(errorMessage);
      } else if (result?.ok) {
        toast.success(await t('messages.registerSuccess'));
        // signIn success will automatically update useSession and redirect in useEffect
      } else {
        const errorMessage = await t('messages.registerGeneralError');
        setRegisterError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = await t('messages.registerError');
      setRegisterError(errorMessage);
      toast.error(errorMessage);
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
            <Image src="/images/logo.svg" alt="KKOT WebUI" width={130} height={24} priority />
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
                  {loginError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                  )}
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
                  {registerError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <AlertDescription>{registerError}</AlertDescription>
                    </Alert>
                  )}
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