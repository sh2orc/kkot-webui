import { NextRequest, NextResponse } from 'next/server';
import { llmServerRepository } from '@/lib/db/server';

// GET: 모든 LLM 서버 설정 조회
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const provider = url.searchParams.get('provider');
    const enabled = url.searchParams.get('enabled');

    if (id) {
      // 특정 ID로 조회
      const server = await llmServerRepository.findById(id);
      if (server && server.length > 0) {
        const result = server[0];
        return NextResponse.json({
          ...result,
          models: result.models ? JSON.parse(result.models) : [],
          settings: result.settings ? JSON.parse(result.settings) : {}
        });
      }
      return NextResponse.json({ message: 'LLM 서버를 찾을 수 없습니다.', id }, { status: 404 });
    } else if (provider) {
      // 특정 프로바이더로 조회
      const servers = await llmServerRepository.findByProvider(provider);
      return NextResponse.json(servers.map(server => ({
        ...server,
        models: server.models ? JSON.parse(server.models) : [],
        settings: server.settings ? JSON.parse(server.settings) : {}
      })));
    } else if (enabled === 'true') {
      // 활성화된 서버만 조회
      const servers = await llmServerRepository.findEnabled();
      return NextResponse.json(servers.map(server => ({
        ...server,
        models: server.models ? JSON.parse(server.models) : [],
        settings: server.settings ? JSON.parse(server.settings) : {}
      })));
    } else {
      // 모든 서버 조회
      const servers = await llmServerRepository.findAll();
      return NextResponse.json(servers.map(server => ({
        ...server,
        models: server.models ? JSON.parse(server.models) : [],
        settings: server.settings ? JSON.parse(server.settings) : {}
      })));
    }
  } catch (error) {
    console.error('LLM 서버 조회 오류:', error);
    return NextResponse.json(
      { error: 'LLM 서버를 조회하는 중 오류가 발생했습니다.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: 새 LLM 서버 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 필수 필드 검증
    if (!body.provider || !body.name || !body.baseUrl) {
      return NextResponse.json(
        { error: 'provider, name, baseUrl는 필수입니다.' },
        { status: 400 }
      );
    }

    // 서버 생성
    const result = await llmServerRepository.create({
      provider: body.provider,
      name: body.name,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      models: body.models,
      enabled: body.enabled,
      isDefault: body.isDefault,
      settings: body.settings
    });

    return NextResponse.json({
      message: 'LLM 서버가 추가되었습니다.',
      data: {
        ...result[0],
        models: result[0].models ? JSON.parse(result[0].models) : [],
        settings: result[0].settings ? JSON.parse(result[0].settings) : {}
      }
    });
  } catch (error) {
    console.error('LLM 서버 추가 오류:', error);
    return NextResponse.json(
      { error: 'LLM 서버를 추가하는 중 오류가 발생했습니다.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT: LLM 서버 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'id는 필수입니다.' },
        { status: 400 }
      );
    }

    // 서버 업데이트
    const result = await llmServerRepository.update(body.id, {
      provider: body.provider,
      name: body.name,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      models: body.models,
      enabled: body.enabled,
      isDefault: body.isDefault,
      settings: body.settings
    });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'LLM 서버를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'LLM 서버가 업데이트되었습니다.',
      data: {
        ...result[0],
        models: result[0].models ? JSON.parse(result[0].models) : [],
        settings: result[0].settings ? JSON.parse(result[0].settings) : {}
      }
    });
  } catch (error) {
    console.error('LLM 서버 업데이트 오류:', error);
    return NextResponse.json(
      { error: 'LLM 서버를 업데이트하는 중 오류가 발생했습니다.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: LLM 서버 삭제
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'id는 필수입니다.' },
        { status: 400 }
      );
    }

    await llmServerRepository.delete(id);

    return NextResponse.json({
      message: 'LLM 서버가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('LLM 서버 삭제 오류:', error);
    return NextResponse.json(
      { error: 'LLM 서버를 삭제하는 중 오류가 발생했습니다.', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 