'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n';
import Loading from '@/components/ui/loading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Github } from 'lucide-react';

interface OAuthProvider {
  id: string;
  name: string;
  type: string;
  clientId?: string;
  signinUrl?: string;
  callbackUrl?: string;
}

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [oauthLoading, setOauthLoading] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    email: '', 
    username: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [oauthProviders, setOauthProviders] = useState<OAuthProvider[]>([]);
  const [activeTab, setActiveTab] = useState('login');
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t, lang, language } = useTranslation('auth');
  const [oauthError, setOauthError] = useState('');

  // Fetch OAuth providers (only active ones from DB)
  useEffect(() => {
    const fetchOAuthProviders = async () => {
      try {
        const response = await fetch('/api/oauth-providers');
        const data = await response.json();
        console.log('OAuth providers response:', data);
        
        setOauthProviders(data);
      } catch (error) {
        console.error('Failed to fetch OAuth providers:', error);
      }
    };
    
    fetchOAuthProviders();
  }, []);

  // Debug logging and error handling
  useEffect(() => {
    console.log('Auth Page - Session Status:', status);
    
    // Check error parameter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      console.log('OAuth Error detected:', error);
      let errorMessage = '';
      
      switch(error) {
        case 'OAuthSignin':
          errorMessage = lang('oauth.errors.signin');
          break;
        case 'OAuthCallback':
          errorMessage = lang('oauth.errors.callback');
          break;
        case 'OAuthCreateAccount':
          errorMessage = lang('oauth.errors.createAccount');
          break;
        case 'EmailCreateAccount':
          errorMessage = lang('oauth.errors.emailCreateAccount');
          break;
        case 'Callback':
          errorMessage = lang('oauth.errors.callbackGeneral');
          break;
        case 'OAuthAccountNotLinked':
          errorMessage = lang('oauth.errors.accountNotLinked');
          break;
        case 'AccessDenied':
          errorMessage = lang('oauth.errors.accessDenied');
          break;
        case 'google':
          errorMessage = lang('oauth.errors.googleConfig');
          break;
        case 'email_required':
          errorMessage = lang('oauth.errors.emailRequired');
          break;
        case 'kakao_oauth':
          errorMessage = lang('oauth.errors.kakaoOauth');
          break;
        default:
          errorMessage = `${lang('oauth.errors.general')}: ${error}`;
      }
      
      setOauthError(errorMessage);
      toast.error(errorMessage);
    }
  }, [status]);

  // Redirect to chat page if already logged in (once only)
  useEffect(() => {
    // Don't redirect if logout parameter exists
    const urlParams = new URLSearchParams(window.location.search);
    const isLoggingOut = urlParams.get('logout') === 'true';
    
    console.log('Auth page - Session status:', status, 'Session:', session, 'Logging out:', isLoggingOut);
    
    if (status === 'authenticated' && session && !isLoggingOut) {
      console.log('User is authenticated, redirecting to /chat...');
      router.replace('/chat');
    }
    
    // Remove logout parameter
    if (isLoggingOut) {
      window.history.replaceState({}, '', '/auth');
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

  // Handle OAuth login
  const handleOAuthLogin = async (providerId: string) => {
    console.log('OAuth login attempt for provider:', providerId);
    console.log('Available providers:', oauthProviders);
    setOauthLoading(providerId);
    
    try {
      if (providerId === 'google') {
        // Redirect to direct Google OAuth implementation (using NextAuth standard URL)
        console.log('🚀 Redirecting to direct Google OAuth...');
        
        // Find Google Client ID from OAuth providers
        const googleProvider = oauthProviders.find(provider => provider.id === 'google');
        if (!googleProvider?.clientId) {
          console.error('Google Client ID not found in OAuth providers');
          setOauthLoading('');
          return;
        }
        
        // Get current domain dynamically
        const baseUrl = window.location.origin;
        const redirectUri = `${baseUrl}/api/auth/callback/google`;
        
        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleAuthUrl.searchParams.set('client_id', googleProvider.clientId);
        googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
        googleAuthUrl.searchParams.set('response_type', 'code');
        googleAuthUrl.searchParams.set('scope', 'openid email profile');
        googleAuthUrl.searchParams.set('access_type', 'offline');
        googleAuthUrl.searchParams.set('prompt', 'consent');
        const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        googleAuthUrl.searchParams.set('state', state);
        
        console.log('🔍 Using base URL:', baseUrl);
        console.log('🔍 Using redirect_uri:', redirectUri);
        console.log('🔍 Using client_id:', googleProvider.clientId);
        console.log('🔍 Full Google Auth URL:', googleAuthUrl.toString());
        
        window.location.href = googleAuthUrl.toString();
        return;
      }

      if (providerId === 'kakao') {
        // Redirect to direct Kakao OAuth implementation
        console.log('🚀 Redirecting to direct Kakao OAuth...');
        
        // Find Kakao Client ID from OAuth providers
        const kakaoProvider = oauthProviders.find(provider => provider.id === 'kakao');
        if (!kakaoProvider?.clientId) {
          console.error('Kakao Client ID not found in OAuth providers');
          setOauthLoading('');
          return;
        }
        
        // Get current domain dynamically
        const baseUrl = window.location.origin;
        const redirectUri = `${baseUrl}/api/auth/callback/kakao`;
        
        const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize');
        kakaoAuthUrl.searchParams.set('client_id', kakaoProvider.clientId);
        kakaoAuthUrl.searchParams.set('redirect_uri', redirectUri);
        kakaoAuthUrl.searchParams.set('response_type', 'code');
        kakaoAuthUrl.searchParams.set('scope', 'account_email');
        const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        kakaoAuthUrl.searchParams.set('state', state);
        
        console.log('🔍 Using base URL:', baseUrl);
        console.log('🔍 Using redirect_uri:', redirectUri);
        console.log('🔍 Using client_id:', kakaoProvider.clientId);
        console.log('🔍 Full Kakao Auth URL:', kakaoAuthUrl.toString());
        
        window.location.href = kakaoAuthUrl.toString();
        return;
      }
      
      // Existing method (for other providers)
      const result = await signIn(providerId, { 
        callbackUrl: '/chat',
        redirect: false
      });
      
      console.log('OAuth signIn result:', result);
      
      if (result?.error) {
        console.error('OAuth error:', result.error);
        toast.error(`OAuth 로그인 failed: ${result.error}`);
      } else if (result?.url) {
        console.log('Redirecting to:', result.url);
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('OAuth login error:', error);
      toast.error('OAuth 로그인에 failed했습니다.');
    } finally {
      setOauthLoading('');
    }
  };

  // OAuth provider icons
  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        );
      case 'github':
        return <Github className="w-5 h-5" />;

      case 'kakao':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#FEE500" d="M12 3C6.48 3 2 6.58 2 11c0 2.8 1.8 5.27 4.5 6.75L5.5 21l3.75-2.25C10.15 18.92 11.05 19 12 19c5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
          </svg>
        );
      case 'naver':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#03C75A" d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(''); // Reset error message

    try {
      // Step 1: Validate credentials with our API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });

      let data;
      try {
        const text = await response.text();
        console.log('Login API raw response:', text);
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Failed to parse login response:', parseError);
        toast.error(lang('parsing.serverResponseFailed'));
        setIsLoading(false);
        setLoadingMessage('');
        return;
      }
      console.log('Login API response:', data);

      if (!data.success) {
        const errorMessage = data.error || await t('messages.loginFailed');
        setLoginError(errorMessage);
        toast.error(errorMessage);
        setIsLoading(false);  // Enable button
        setLoadingMessage('');  // Clear loading message
        return;
      }

      // Step 2: Set loading message
      setLoadingMessage(lang('oauth.loading.creatingSession'));
      
      // Step 3: Create session using custom API
      console.log('Creating session...');
      
      setTimeout(async () => {
        try {
          const sessionResponse = await fetch('/api/auth/custom-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: loginForm.email,
              password: loginForm.password,
            }),
          });

          let sessionData;
          try {
            const text = await sessionResponse.text();
            console.log('Session API raw response:', text);
            sessionData = text ? JSON.parse(text) : {};
          } catch (parseError) {
            console.error('Failed to parse session response:', parseError);
            toast.error(lang('parsing.sessionResponseFailed'));
            setIsLoading(false);
            setLoadingMessage('');
            return;
          }
          console.log('Session creation response:', sessionData);

          if (!sessionData.success) {
            const errorMessage = sessionData.error || lang('oauth.loading.sessionError');
            setLoginError(errorMessage);
            toast.error(errorMessage);
            setIsLoading(false);  // Enable button
            setLoadingMessage('');  // Clear loading message
            return;
          }

          toast.success(lang('oauth.loading.redirecting'));
          setLoadingMessage(lang('oauth.loading.movingPage'));
          
          // Verify session is created
          const verifyResponse = await fetch('/api/auth/session');
          let session;
          try {
            const text = await verifyResponse.text();
            console.log('Session verify raw response:', text);
            session = text ? JSON.parse(text) : {};
          } catch (parseError) {
            console.error('Failed to parse session verify response:', parseError);
            // Continue anyway - session might still be created
          }
          console.log('Verified session:', session);
          
          // Check user role and redirect accordingly
          if (session?.user?.role === 'guest') {
            setTimeout(() => {
              console.log('Redirecting guest to /auth/pending...');
              window.location.href = '/auth/pending';
            }, 1000);
          } else {
            setTimeout(() => {
              console.log('Redirecting to /chat...');
              window.location.href = '/chat';
            }, 1000);
          }
          
        } catch (sessionError) {
          console.error('Session creation error:', sessionError);
          toast.error(lang('oauth.loading.sessionError'));
        } finally {
          setIsLoading(false);
          setLoadingMessage('');
        }
      }, 1000); // Try session creation after 1 second
      
    } catch (error) {
      const errorMessage = await t('messages.loginError');
      setLoginError(errorMessage);
      toast.error(errorMessage);
      console.error('Login error:', error);
      setIsLoading(false);
      setLoadingMessage('');
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
      // Register with our API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registerForm.email,
          password: registerForm.password,
          username: registerForm.username,
        }),
      });

      let data;
      try {
        const text = await response.text();
        console.log('Register API raw response:', text);
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Failed to parse register response:', parseError);
        toast.error(lang('parsing.serverResponseFailed'));
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const errorMessage = data.error || await t('messages.registerFailed');
        setRegisterError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      // Registration successful
      const successMessage = data.message || await t('messages.registerSuccess');
      toast.success(successMessage);
      
      // If guest account, redirect to pending page
      if (data.user?.role === 'guest') {
        toast.success(lang('account.created'));
        
        // Auto login as guest and redirect to pending page
        const signInResult = await signIn('credentials', {
          email: registerForm.email,
          password: registerForm.password,
          redirect: false
        });
        
        if (signInResult?.ok) {
          router.push('/auth/pending');
          return;
        } else {
          // If auto login fails, redirect to pending page with message
          router.push('/auth/pending');
          return;
        }
      }
      
      // Pre-fill email in login form
      const registeredEmail = registerForm.email;
      setLoginForm({
        email: registeredEmail,
        password: ''
      });
      
      // Clear registration form
      setRegisterForm({
        email: '',
        username: '',
        password: '',
        confirmPassword: ''
      });
      
      // Switch to login tab
      console.log('Current tab:', activeTab, '-> Switching to login tab');
      setActiveTab('login');
      
      // Force click on login tab as a fallback
      setTimeout(() => {
        const loginTab = document.querySelector('[value="login"]');
        if (loginTab instanceof HTMLElement) {
          loginTab.click();
        }
      }, 100);
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center items-center">
            <Image src="/images/logo.svg" alt="KKOT WebUI" width={80} height={24} priority />
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {safeTranslate('subtitle', 'Sign in to your account or create a new one')}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => {
          console.log('Tab changed to:', value);
          setActiveTab(value);
        }} className="w-full">
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
                  {oauthError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      <AlertDescription>{oauthError}</AlertDescription>
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
                <CardFooter className="flex flex-col space-y-4">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (loadingMessage || safeTranslate('login.loading', 'Signing in...')) : safeTranslate('login.button', 'Sign In')}
                  </Button>
                  
                  {oauthProviders.length > 0 && (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white dark:bg-gray-900 px-2 text-muted-foreground">{lang('ui.or')}</span>
                        </div>
                      </div>
                      
                      <div className="grid gap-2 w-full">
                        {oauthProviders.map((provider) => (
                          <Button
                            key={provider.id}
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={oauthLoading === provider.id}
                            onClick={() => handleOAuthLogin(provider.id)}
                          >
                            {oauthLoading === provider.id ? (
                              <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 mr-2" />
                            ) : (
                              <span className="mr-2">{getProviderIcon(provider.id)}</span>
                            )}
                            {provider.name}{lang('oauth.loginWith')}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
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
                <CardFooter className="flex flex-col space-y-4">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? safeTranslate('register.loading', 'Registering...') : safeTranslate('register.button', 'Register')}
                  </Button>
                  
                  {oauthProviders.length > 0 && (
                    <>
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white dark:bg-gray-900 px-2 text-muted-foreground">{lang('ui.or')}</span>
                        </div>
                      </div>
                      
                      <div className="grid gap-2 w-full">
                        {oauthProviders.map((provider) => (
                          <Button
                            key={provider.id}
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={oauthLoading === provider.id}
                            onClick={() => handleOAuthLogin(provider.id)}
                          >
                            {oauthLoading === provider.id ? (
                              <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 mr-2" />
                            ) : (
                              <span className="mr-2">{getProviderIcon(provider.id)}</span>
                            )}
                            {provider.name}{lang('oauth.signupWith')}
                          </Button>
                        ))}
                      </div>
                    </>
                  )}
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 