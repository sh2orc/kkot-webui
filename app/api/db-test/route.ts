import { NextRequest, NextResponse } from 'next/server';
import { initializeDb, getDb, adminSettingsRepository, agentManageRepository } from '@/lib/db/server';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '@/lib/db/server';
import { agentManage } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * DB Test API
 * 
 * This API tests DB connection and basic CRUD operations.
 * In production environment, this should be removed or secured.
 */

// GET: DB initialization and test
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    
    if (agentId) {
      // 특정 에이전트 조회
      const result = await agentManageRepository.findById(agentId);
      
      if (result.length > 0) {
        const agent = result[0];
        console.log('=== 에이전트 이미지 데이터 분석 ===');
        console.log('에이전트 ID:', agent.id);
        console.log('에이전트 이름:', agent.name);
        console.log('이미지 데이터 타입:', typeof agent.imageData);
        console.log('이미지 데이터 길이:', 
          agent.imageData instanceof Uint8Array ? agent.imageData.length : 
          typeof agent.imageData === 'string' ? agent.imageData.length : 
          'unknown'
        );
        
        if (agent.imageData) {
          if (agent.imageData instanceof Uint8Array) {
            console.log('Uint8Array 샘플:', agent.imageData.slice(0, 20));
          } else if (typeof agent.imageData === 'string') {
            console.log('문자열 샘플:', agent.imageData.substring(0, 100));
          }
        }
        console.log('=== 분석 완료 ===');
        
        return NextResponse.json({
          id: agent.id,
          name: agent.name,
          imageDataType: typeof agent.imageData,
          imageDataLength: agent.imageData instanceof Uint8Array ? agent.imageData.length : 
                          typeof agent.imageData === 'string' ? agent.imageData.length : 0,
          hasImageData: !!agent.imageData,
          imageDataSample: agent.imageData instanceof Uint8Array ? 
                          Array.from(agent.imageData.slice(0, 20)) :
                          typeof agent.imageData === 'string' ? 
                          agent.imageData.substring(0, 100) : null
        });
      } else {
        return NextResponse.json({ error: '에이전트를 찾을 수 없습니다.' }, { status: 404 });
      }
    }
    
    // 기존 테스트 코드
    const result = await agentManageRepository.findAll();
    
    return NextResponse.json({
      message: 'Database connection successful',
      agentCount: result.length,
      agents: result.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        hasImage: !!agent.imageData
      }))
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json(
      { error: 'Database connection failed', details: error },
      { status: 500 }
    );
  }
}

// POST: Add example system settings data
export async function POST(request: NextRequest) {
  try {
    await initializeDb();
    
    // Example system settings data
    const exampleData = [
      { key: 'app.name', value: 'kkot-webui' },
      { key: 'auth.signupEnabled', value: 'true' },
      { key: 'auth.apiKeyEnabled', value: 'true' },
      { key: 'auth.apiKeyEndpointLimited', value: 'false' },
      { key: 'auth.jwtExpiry', value: '-1' }
    ];
    
    // Add settings
    const results = [];
    for (const item of exampleData) {
      try {
        const { key, value } = item;
        
        // Save data using repository
        const result = await adminSettingsRepository.upsert(key, value);
        results.push({ key, value, success: true });
      } catch (err: any) {
        console.error(`Error adding item ${item.key}:`, err);
        results.push({ key: item.key, success: false, error: err.message });
      }
    }
    
    return NextResponse.json({
      message: "Example settings data has been successfully added.",
      results
    });
    
  } catch (error) {
    console.error('Error adding example data:', error);
    return NextResponse.json(
      { error: 'An error occurred while adding example data.' },
      { status: 500 }
    );
  }
} 