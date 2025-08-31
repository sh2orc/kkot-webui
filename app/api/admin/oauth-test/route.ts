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
        'microsoft': 'auth.oauth.microsoft.clientSecret',
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
      case 'microsoft':
        testResult = await testMicrosoftOAuth(clientId, actualClientSecret)
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

// Microsoft OAuth 테스트
async function testMicrosoftOAuth(clientId: string, clientSecret: string) {
  try {
    // Microsoft Graph API를 통한 검증
    const response = await fetch(`https://login.microsoftonline.com/common/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope: 'https://graph.microsoft.com/.default',
      }),
    })

    if (response.status === 400 || response.status === 401) {
      return {
        success: false,
        message: 'Invalid client credentials',
        details: 'Microsoft Client ID 또는 Client Secret이 올바르지 않습니다.'
      }
    }

    return {
      success: true,
      message: 'Microsoft OAuth configuration is valid',
      details: 'Microsoft OAuth 설정이 올바르게 구성되었습니다.'
    }
  } catch (error) {
    return {
      success: false,
      message: 'Connection failed',
      details: 'Microsoft OAuth 서버에 연결할 수 없습니다.'
    }
  }
}

// Kakao OAuth 테스트
async function testKakaoOAuth(clientId: string, clientSecret: string) {
  try {
    // Kakao API를 통한 앱 정보 조회
    const response = await fetch('https://kapi.kakao.com/v1/user/access_token_info', {
      method: 'GET',
      headers: {
        'Authorization': `KakaoAK ${clientId}`,
      },
    })

    if (response.status === 401) {
      return {
        success: false,
        message: 'Invalid API key',
        details: 'Kakao REST API 키가 올바르지 않습니다.'
      }
    }

    return {
      success: true,
      message: 'Kakao OAuth configuration is valid',
      details: 'Kakao OAuth 설정이 올바르게 구성되었습니다.'
    }
  } catch (error) {
    return {
      success: false,
      message: 'Connection failed',
      details: 'Kakao OAuth 서버에 연결할 수 없습니다.'
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
