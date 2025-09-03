// Vector store connection test API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { VectorStoreFactory, VectorStoreConfig } from '@/lib/rag';

// POST /api/rag/vector-stores/test - Test vector store connection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, connectionString, apiKey, settings } = body;

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'Type is required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['chromadb', 'pgvector', 'faiss'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid vector store type' },
        { status: 400 }
      );
    }

    // Test connection
    const config: VectorStoreConfig = {
      type,
      connectionString,
      apiKey,
      settings: settings ? JSON.parse(settings) : undefined,
    };

    try {
      const store = await VectorStoreFactory.create(config);
      await store.disconnect();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Connection test successful' 
      });
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let troubleshooting = '';

      // Provide specific troubleshooting advice based on error type
      if (type === 'chromadb') {
        if (errorMessage.includes('Failed to connect to chromadb')) {
          troubleshooting = `
ChromaDB 연결 문제 해결 방법:

1. ChromaDB 서버가 실행 중인지 확인:
   docker run -p 8000:8000 chromadb/chroma

2. CORS 설정 (브라우저에서 접근 시):
   CHROMA_SERVER_CORS_ALLOW_ORIGINS="*" docker run -p 8000:8000 chromadb/chroma

3. 연결 URL 확인:
   - 로컬: http://localhost:8000
   - 원격: https://your-chroma-server.com

4. 방화벽 설정 확인
          `.trim();
        }
      } else if (type === 'pgvector') {
        troubleshooting = `
pgvector 연결 문제 해결 방법:

1. PostgreSQL 서버가 실행 중인지 확인
2. pgvector 확장이 설치되어 있는지 확인:
   CREATE EXTENSION vector;
3. 연결 문자열 형식 확인:
   postgresql://username:password@host:port/database
4. 데이터베이스 권한 확인
        `.trim();
      }

      return NextResponse.json(
        { 
          error: `연결 테스트 failed: ${errorMessage}`,
          troubleshooting: troubleshooting || undefined
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json(
      { error: 'Connection test failed' },
      { status: 500 }
    );
  }
}
