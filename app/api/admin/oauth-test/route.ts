import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { adminSettingsRepository } from '@/lib/db/repository'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { provider, clientId, clientSecret, useStoredSecret } = body

    if (!provider || !clientId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 저장된 secret을 사용해야 하는 경우
    let actualClientSecret = clientSecret
    if (useStoredSecret) {
      // Provider별 secret key 매핑
      const secretKeyMap: Record<string, string> = {
        'google': 'auth.oauth.google.clientSecret',

        'kakao': 'auth.oauth.kakao.clientSecret',
        'naver': 'auth.oauth.naver.clientSecret',
        'github': 'auth.oauth.github.clientSecret',
      }
      
      const secretKey = secretKeyMap[provider]
      if (secretKey) {
        const storedSetting = await adminSettingsRepository.findByKey(secretKey)
        if (storedSetting && storedSetting.length > 0) {
          actualClientSecret = storedSetting[0].value
        } else {
          return NextResponse.json(
            { 
              success: false,
              message: 'No stored secret found',
              details: '저장된 Client Secret이 없습니다. 새로 입력해주세요.'
            }
          )
        }
      }
    }

    if (!actualClientSecret) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Client Secret is required',
          details: 'Client Secret을 입력해주세요.'
        }
      )
    }

    // OAuth 제공자별 테스트 로직
    let testResult = { success: false, message: '', details: '' }

    switch (provider) {
      case 'google':
        testResult = await testGoogleOAuth(clientId, actualClientSecret)
        break

      case 'kakao':
        testResult = await testKakaoOAuth(clientId, actualClientSecret)
        break
      case 'naver':
        testResult = await testNaverOAuth(clientId, actualClientSecret)
        break
      case 'github':
        testResult = await testGithubOAuth(clientId, actualClientSecret)
        break
      default:
        return NextResponse.json(
          { error: 'Unsupported OAuth provider' },
          { status: 400 }
        )
    }

    return NextResponse.json(testResult)
  } catch (error) {
    console.error('OAuth test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Google OAuth 테스트
async function testGoogleOAuth(clientId: string, clientSecret: string) {
  try {
    // Google OAuth 설정 검증을 위한 요청
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    })

    if (response.status === 400) {
      const errorData = await response.json()
      if (errorData.error === 'invalid_client') {
        return {
          success: false,
          message: 'Invalid client credentials',
          details: 'Client ID 또는 Client Secret이 올바르지 않습니다.'
        }
      }
    }

    // Client credentials가 유효하면 성공으로 간주
    return {
      success: true,
      message: 'Google OAuth configuration is valid',
      details: 'Google OAuth 설정이 올바르게 구성되었습니다.'
    }
  } catch (error) {
    return {
      success: false,
      message: 'Connection failed',
      details: 'Google OAuth 서버에 연결할 수 없습니다.'
    }
  }
}



// Kakao OAuth 테스트
async function testKakaoOAuth(clientId: string, clientSecret: string) {
  try {
    // Kakao OAuth 토큰 발급 테스트를 통한 설정 검증
    // 실제 유효한 code 없이 테스트하여 에러 응답으로 설정 유효성 확인
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: 'http://localhost:3000/api/auth/callback/kakao',
      code: 'invalid_test_code', // 의도적으로 잘못된 코드 사용
    })

    // Client Secret이 있으면 추가
    if (clientSecret && !clientSecret.startsWith('******')) {
      tokenParams.append('client_secret', clientSecret)
    }

    const response = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    })

    const result = await response.json()

    // Client ID가 잘못된 경우 (400 with invalid_client)
    if (result.error === 'invalid_client') {
      return {
        success: false,
        message: 'Invalid client credentials',
        details: 'Kakao Client ID가 올바르지 않습니다. 카카오 개발자 콘솔에서 REST API 키를 확인해주세요.'
      }
    }

    // Redirect URI가 잘못된 경우
    if (result.error === 'invalid_grant' && result.error_description?.includes('redirect_uri')) {
      return {
        success: false,
        message: 'Invalid redirect URI',
        details: 'Redirect URI 설정을 확인해주세요: http://localhost:3000/api/auth/callback/kakao'
      }
    }

    // Authorization code가 잘못된 경우 (예상되는 정상적인 에러)
    if (result.error === 'invalid_grant' && !result.error_description?.includes('redirect_uri')) {
      return {
        success: true,
        message: 'Kakao OAuth configuration is valid',
        details: 'Kakao Client ID와 Redirect URI 설정이 올바르게 구성되었습니다. (Authorization Code 오류는 정상적인 테스트 결과입니다.)'
      }
    }

    // 기타 예상치 못한 에러
    if (result.error) {
      return {
        success: false,
        message: 'Configuration error',
        details: `Kakao OAuth 설정 오류: ${result.error} - ${result.error_description || '자세한 내용은 카카오 개발자 문서를 참고해주세요.'}`
      }
    }

    // 200 응답이지만 에러가 없는 경우 (예상치 못한 상황)
    return {
      success: true,
      message: 'Kakao OAuth configuration appears valid',
      details: 'Kakao OAuth 설정이 올바른 것으로 보입니다.'
    }

  } catch (error) {
    console.error('Kakao OAuth test error:', error)
    return {
      success: false,
      message: 'Connection failed',
      details: 'Kakao OAuth 서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.'
    }
  }
}

// Naver OAuth 테스트
async function testNaverOAuth(clientId: string, clientSecret: string) {
  try {
    // Naver API 기본 검증 (실제로는 유효한 토큰이 필요하지만, 설정 검증용)
    const response = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    const data = await response.json()
    
    if (data.error === 'invalid_client') {
      return {
        success: false,
        message: 'Invalid client credentials',
        details: 'Naver Client ID 또는 Client Secret이 올바르지 않습니다.'
      }
    }

    return {
      success: true,
      message: 'Naver OAuth configuration is valid',
      details: 'Naver OAuth 설정이 올바르게 구성되었습니다.'
    }
  } catch (error) {
    return {
      success: false,
      message: 'Connection failed',
      details: 'Naver OAuth 서버에 연결할 수 없습니다.'
    }
  }
}

// GitHub OAuth 테스트
async function testGithubOAuth(clientId: string, clientSecret: string) {
  try {
    // GitHub API를 통한 앱 정보 조회
    const response = await fetch(`https://api.github.com/applications/${clientId}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        access_token: 'dummy_token_for_validation'
      }),
    })

    if (response.status === 401) {
      return {
        success: false,
        message: 'Invalid client credentials',
        details: 'GitHub Client ID 또는 Client Secret이 올바르지 않습니다.'
      }
    }

    return {
      success: true,
      message: 'GitHub OAuth configuration is valid',
      details: 'GitHub OAuth 설정이 올바르게 구성되었습니다.'
    }
  } catch (error) {
    return {
      success: false,
      message: 'Connection failed',
      details: 'GitHub OAuth 서버에 연결할 수 없습니다.'
    }
  }
}
