'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, AlertCircle, User, Mail } from 'lucide-react';

interface OAuthUserData {
  email: string;
  name: string;
  picture?: string;
  provider: string;
}

interface ExistingUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

// Provider별 브랜딩 색상과 스타일 정의 (미니멀 버전)
const getProviderStyles = (provider: string) => {
  switch (provider) {
    case 'google':
      return {
        name: '구글',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        iconColor: 'text-blue-600',
        textColor: 'text-blue-700',
        buttonColor: 'bg-blue-600 hover:bg-blue-700'
      };
    case 'kakao':
      return {
        name: '카카오',
        bgClass: 'bg-yellow-50',
        borderClass: 'border-yellow-200',
        iconColor: 'text-yellow-600',
        textColor: 'text-yellow-800',
        buttonColor: 'bg-yellow-500 hover:bg-yellow-600'
      };
    case 'github':
      return {
        name: '깃허브',
        bgClass: 'bg-gray-50',
        borderClass: 'border-gray-200',
        iconColor: 'text-gray-600',
        textColor: 'text-gray-800',
        buttonColor: 'bg-gray-800 hover:bg-gray-900'
      };
    case 'naver':
      return {
        name: '네이버',
        bgClass: 'bg-green-50',
        borderClass: 'border-green-200',
        iconColor: 'text-green-600',
        textColor: 'text-green-800',
        buttonColor: 'bg-green-600 hover:bg-green-700'
      };
    default:
      return {
        name: 'OAuth',
        bgClass: 'bg-gray-50',
        borderClass: 'border-gray-200',
        iconColor: 'text-gray-600',
        textColor: 'text-gray-800',
        buttonColor: 'bg-gray-700 hover:bg-gray-800'
      };
  }
};

export default function LinkAccountPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [oauthData, setOauthData] = useState<OAuthUserData | null>(null);
  const [existingUser, setExistingUser] = useState<ExistingUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestMessage, setGuestMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchLinkData = async () => {
      try {
        const encodedData = searchParams.get('data');
        const token = searchParams.get('token'); // 기존 방식도 지원
        
        if (!encodedData && !token) {
          setError('연동 정보가 없습니다.');
          return;
        }

        let url;
        if (encodedData) {
          url = `/api/auth/link-account?data=${encodedData}`;
        } else {
          url = `/api/auth/link-account?token=${token}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || '연동 정보를 가져올 수 없습니다.');
          return;
        }

        setOauthData(data.oauthData);
        setExistingUser(data.existingUser);
      } catch (error) {
        setError('연동 정보를 가져오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchLinkData();
  }, [searchParams]);

  const handleLinkAccount = async () => {
    setLinking(true);
    setError(null);
    setGuestMessage(null);

    try {
      const encodedData = searchParams.get('data');
      const token = searchParams.get('token');
      
      const requestBody: any = { action: 'link' };
      if (encodedData) {
        requestBody.data = encodedData;
      } else {
        requestBody.token = token;
      }

      const response = await fetch('/api/auth/link-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        // Guest 계정인 경우 안내 메시지로 처리
        if (response.status === 403 && data.message) {
          setGuestMessage(data.message);
        } else {
          setError(data.error || '계정 연동에 실패했습니다.');
        }
        return;
      }

      // 연동 성공 - 로그인 처리
      if (data.success) {
        // 세션 새로고침을 위해 페이지 전체 새로고침
        window.location.href = '/chat';
      }
    } catch (error) {
      setError('계정 연동 중 오류가 발생했습니다.');
    } finally {
      setLinking(false);
    }
  };

  const handleCreateNewAccount = async () => {
    setLinking(true);
    setError(null);
    setGuestMessage(null);

    try {
      const encodedData = searchParams.get('data');
      const token = searchParams.get('token');
      
      const requestBody: any = { action: 'create' };
      if (encodedData) {
        requestBody.data = encodedData;
      } else {
        requestBody.token = token;
      }

      const response = await fetch('/api/auth/link-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        // Guest 계정인 경우 안내 메시지로 처리
        if (response.status === 403 && data.message) {
          setGuestMessage(data.message);
        } else {
          setError(data.error || '새 계정 생성에 실패했습니다.');
        }
        return;
      }

      // 계정 생성 성공 - 로그인 처리
      if (data.success) {
        // 세션 새로고침을 위해 페이지 전체 새로고침
        window.location.href = '/chat';
      }
    } catch (error) {
      setError('새 계정 생성 중 오류가 발생했습니다.');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-3 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-800">
              연동 정보를 확인하는 중...
            </h3>
            <p className="text-gray-500 text-sm">
              잠시만 기다려주세요
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (guestMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-blue-500 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-800">
              안내
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-gray-600 mb-6 whitespace-pre-line bg-blue-50 p-4 rounded-lg text-sm leading-relaxed">
              {guestMessage}
            </div>
            <Button 
              onClick={() => router.push('/auth')} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
            >
              로그인 페이지로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-800">
              오류 발생
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-gray-600 mb-6 whitespace-pre-line bg-gray-50 p-4 rounded-lg text-sm leading-relaxed">
              {error}
            </div>
            <Button 
              onClick={() => router.push('/auth')} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
            >
              로그인 페이지로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const providerStyles = getProviderStyles(oauthData?.provider || 'oauth');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl">
        {/* 헤더 섹션 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            계정 연동
          </h1>
          <p className="text-gray-600">
            <span className={`font-medium ${providerStyles.textColor}`}>
              {providerStyles.name}
            </span> 계정과 기존 계정을 연동하시겠습니까?
          </p>
        </div>

        {/* 메인 카드 */}
        <Card className="shadow-lg bg-white">
          <div className={`h-1 ${providerStyles.buttonColor.split(' ')[0]}`}></div>
        
          <CardContent className="p-8 space-y-8">
            {/* OAuth 계정 정보 */}
            <div className={`${providerStyles.bgClass} border ${providerStyles.borderClass} p-6 rounded-lg`}>
              <h3 className={`font-semibold ${providerStyles.textColor} mb-4 flex items-center gap-2`}>
                <CheckCircle className="h-5 w-5" />
                {providerStyles.name} 계정 정보
              </h3>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                  <AvatarImage src={oauthData?.picture} alt={oauthData?.name} />
                  <AvatarFallback className="bg-gray-100">
                    <User className="h-6 w-6 text-gray-600" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{oauthData?.name}</p>
                  <p className="text-gray-600 flex items-center gap-2 mt-1 text-sm">
                    <Mail className="h-4 w-4" />
                    {oauthData?.email}
                  </p>
                  <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded text-xs font-medium ${providerStyles.bgClass} ${providerStyles.textColor} border ${providerStyles.borderClass}`}>
                    <CheckCircle className="h-3 w-3" />
                    {providerStyles.name} 인증됨
                  </div>
                </div>
              </div>
            </div>

            {/* 기존 계정 정보 */}
            {existingUser && (
              <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  기존 계정 정보
                </h3>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm bg-green-100">
                    <AvatarFallback className="text-green-700 font-semibold">
                      {existingUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{existingUser.username}</p>
                    <p className="text-gray-600 flex items-center gap-2 mt-1 text-sm">
                      <Mail className="h-4 w-4" />
                      {existingUser.email}
                    </p>
                    <div className="mt-2">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                        existingUser.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {existingUser.role === 'admin' ? '관리자' : '사용자'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">
                    {existingUser ? '계정 연동 안내' : '새 계정 생성 안내'}
                  </h4>
                  <p className="text-blue-800 text-sm leading-relaxed">
                    {existingUser ? (
                      <>
                        동일한 이메일 주소로 기존 계정이 발견되었습니다. 
                        <span className={`font-medium ${providerStyles.textColor}`}>
                          {providerStyles.name}
                        </span> 계정과 기존 계정을 연동하면 {providerStyles.name}로 간편하게 로그인할 수 있습니다.
                      </>
                    ) : (
                      <>
                        기존 계정이 없습니다. 
                        <span className={`font-medium ${providerStyles.textColor}`}>
                          {providerStyles.name}
                        </span> 계정으로 새 계정을 생성하시겠습니까?
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="space-y-4">
              <div className="flex gap-3">
                {existingUser ? (
                  <>
                    <Button
                      onClick={handleLinkAccount}
                      disabled={linking}
                      className={`flex-1 ${providerStyles.buttonColor} text-white font-medium`}
                    >
                      {linking ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent mr-2"></div>
                          연동 중...
                        </>
                      ) : (
                        '계정 연동하기'
                      )}
                    </Button>
                    <Button
                      onClick={handleCreateNewAccount}
                      disabled={linking}
                      variant="outline"
                      className="flex-1 border-gray-300 hover:bg-gray-50 font-medium"
                    >
                      {linking ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-b-transparent mr-2"></div>
                          생성 중...
                        </>
                      ) : (
                        '새 계정 생성'
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleCreateNewAccount}
                    disabled={linking}
                    className={`w-full ${providerStyles.buttonColor} text-white font-medium`}
                  >
                    {linking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent mr-2"></div>
                        계정 생성 중...
                      </>
                    ) : (
                      '새 계정 생성하기'
                    )}
                  </Button>
                )}
              </div>

              <div className="text-center">
                <Button
                  onClick={() => router.push('/auth')}
                  variant="ghost"
                  disabled={linking}
                  className="text-gray-500 hover:text-gray-700"
                >
                  취소하고 돌아가기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
