import { NextRequest, NextResponse } from 'next/server';

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
          message = `Connection successful (${modelCount} models found)`;
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
          message = `Connection successful (${modelCount} models found)`;
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
        const response = await fetch(`${baseUrl}/models?key=${apiKey}`);
        
        if (response.ok) {
          const data = await response.json();
          modelCount = data.models?.length || 0;
          isConnected = true;
          message = `Connection successful (${modelCount} models found)`;
        } else {
          const errorData = await response.json().catch(() => ({}));
          message = errorData.error?.message || `Connection failed: ${response.status} ${response.statusText}`;
        }
      } catch (error) {
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