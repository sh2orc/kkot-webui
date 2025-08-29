import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

// POST: LLM server connection test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, baseUrl, apiKey } = body;
    
    if (!provider || !baseUrl) {
      return NextResponse.json(
        { error: 'provider and baseUrl are required.' },
        { status: 400 }
      );
    }
    
    let isConnected = false;
    let message = '';
    let modelCount = 0;
    
    // OpenAI connection test
    if (provider === 'openai') {
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          message: 'OpenAI API key is required.'
        });
      }
      
      try {
        const response = await fetch(`${baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const models = data.data?.filter((model: any) => 
            model.id.includes('gpt') || model.id.includes('dall-e') || model.id.includes('whisper')
          ) || [];
          modelCount = models.length;
          isConnected = true;
          message = `successful`;
        } else {
          const errorData = await response.json().catch(() => ({}));
          message = errorData.error?.message || `Connection failed: ${response.status} ${response.statusText}`;
        }
      } catch (error) {
        message = `Connection failed: ${error instanceof Error ? error.message : 'Network error'}`;
      }
    }
    
    // Ollama connection test
    else if (provider === 'ollama') {
      try {
        const response = await fetch(`${baseUrl}/api/tags`);
        
        if (response.ok) {
          const data = await response.json();
          modelCount = data.models?.length || 0;
          isConnected = true;
          message = `successful`;
        } else {
          message = `Connection failed: ${response.status} ${response.statusText}`;
        }
      } catch (error) {
        message = `Connection failed: ${error instanceof Error ? error.message : 'Check if the server is running'}`;
      }
    }
    
    // Gemini connection test
    else if (provider === 'gemini') {
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          message: 'Gemini API key is required.'
        });
      }
      
      try {
        // Google Generative AI API의 올바른 엔드포인트 사용
        const geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        const modelsUrl = `${geminiBaseUrl}/models?key=${apiKey}`;
        
        console.log('Gemini test - Request URL:', modelsUrl.replace(apiKey, 'API_KEY_HIDDEN'));
        
        // SSL 인증서 문제 해결을 위한 Agent 설정
        // 주의: rejectUnauthorized: false는 보안상 위험할 수 있습니다.
        // 프로덕션 환경에서는 올바른 인증서를 사용하거나 프록시 설정을 확인하세요.
        const shouldVerifySSL = process.env.SSL_VERIFY !== 'false' && process.env.NODE_ENV !== 'development';
        const httpsAgent = new https.Agent({
          rejectUnauthorized: shouldVerifySSL
        });
        
        if (!shouldVerifySSL) {
          console.warn('⚠️  WARNING: SSL certificate verification is disabled. This should only be used in development.');
          console.warn('⚠️  To enable SSL verification, unset SSL_VERIFY environment variable or set it to "true".');
        }
        
        const response = await fetch(modelsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          // @ts-ignore - fetch의 agent 옵션은 Node.js 환경에서만 사용 가능
          agent: httpsAgent
        });
        
        const responseText = await response.text();
        console.log('Gemini test - Response status:', response.status);
        console.log('Gemini test - Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
          try {
            const data = JSON.parse(responseText);
            modelCount = data.models?.length || 0;
            isConnected = true;
            message = `successful`;
            console.log('Gemini test - Success, model count:', modelCount);
          } catch (parseError) {
            console.error('Gemini test - JSON parse error:', parseError);
            message = `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`;
          }
        } else {
          console.error('Gemini test - Error response:', responseText);
          try {
            const errorData = JSON.parse(responseText);
            message = errorData.error?.message || `Connection failed: ${response.status} ${response.statusText}`;
          } catch {
            message = `Connection failed: ${response.status} ${response.statusText}`;
          }
        }
      } catch (error) {
        console.error('Gemini test - Fetch error:', error);
        message = `Connection failed: ${error instanceof Error ? error.message : 'Network error'}`;
      }
    }
    
    else {
      message = `Unsupported provider: ${provider}`;
    }
    
    return NextResponse.json({
      success: isConnected,
      message,
      modelCount
    });
    
  } catch (error) {
    console.error('Server connection test error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'An error occurred during the connection test.' 
      },
      { status: 500 }
    );
  }
} 