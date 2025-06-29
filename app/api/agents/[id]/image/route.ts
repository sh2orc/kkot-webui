import { NextRequest, NextResponse } from 'next/server'
import { agentManageRepository } from '@/lib/db/server'

// GET - Fetch agent image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("에이전트 이미지 요청:", id);
    
    // 에이전트 정보 조회
    const agentData = await agentManageRepository.findById(id);
    
    if (!agentData || agentData.length === 0 || !agentData[0].imageData) {
      console.log("이미지 없음:", id);
      return NextResponse.json(
        { error: '이미지를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    const agent = agentData[0];
    let imageData;
    
    try {
      console.log('원본 이미지 데이터 타입:', typeof agent.imageData);
      console.log('원본 이미지 데이터 길이:', agent.imageData instanceof Uint8Array ? agent.imageData.length : agent.imageData?.length);
      console.log('원본 이미지 데이터 샘플:', 
        agent.imageData instanceof Uint8Array 
          ? `Uint8Array[${agent.imageData.slice(0, 10).join(',')}...]`
          : agent.imageData?.substring(0, 50) + '...'
      );
      
      // 다양한 형식의 이미지 데이터 처리
      if (agent.imageData instanceof Uint8Array) {
        // SQLite에서는 Uint8Array로 저장됨
        // 데이터가 너무 작으면 오류
        if (agent.imageData.length < 100) {
          console.error('이미지 데이터가 너무 작음:', agent.imageData.length, '바이트');
          return NextResponse.json(
            { error: '이미지 데이터가 손상되었거나 불완전합니다.' },
            { status: 400 }
          );
        }
        
        const base64String = Buffer.from(agent.imageData).toString();
        imageData = `data:image/png;base64,${base64String}`;
        console.log('이미지 데이터 변환 (Uint8Array -> base64 URL)');
        console.log('변환된 base64 길이:', base64String.length);
        console.log('변환된 base64 샘플:', base64String.substring(0, 50) + '...');
      } else if (typeof agent.imageData === 'string') {
        // PostgreSQL에서는 base64 문자열로 저장됨
        // 데이터가 너무 작으면 오류
        if (agent.imageData.length < 100) {
          console.error('이미지 데이터가 너무 작음:', agent.imageData.length, '문자');
          return NextResponse.json(
            { error: '이미지 데이터가 손상되었거나 불완전합니다.' },
            { status: 400 }
          );
        }
        
        // 이미 data:image/ 형식이면 그대로 사용
        if (agent.imageData.startsWith('data:')) {
          imageData = agent.imageData;
          console.log('이미지 데이터 변환 (이미 data URL 형식)');
        } else {
          // 일반 base64 문자열이면 data URL로 변환
          imageData = `data:image/png;base64,${agent.imageData}`;
          console.log('이미지 데이터 변환 (base64 -> data URL)');
          console.log('원본 base64 길이:', agent.imageData.length);
        }
      } else if (typeof agent.imageData === 'object' && agent.imageData !== null) {
        // 잘못 저장된 경우: ASCII 코드 배열 또는 기타 객체 형태
        console.log('객체 형태의 이미지 데이터 감지');
        
        if (Array.isArray(agent.imageData)) {
          // ASCII 코드 배열인 경우
          console.log('ASCII 코드 배열을 문자열로 변환');
          const base64String = String.fromCharCode(...agent.imageData);
          console.log('변환된 base64 문자열 길이:', base64String.length);
          console.log('변환된 base64 샘플:', base64String.substring(0, 50) + '...');
          
          if (base64String.length < 100) {
            console.error('변환된 base64 데이터가 너무 작음:', base64String.length, '문자');
            return NextResponse.json(
              { error: '이미지 데이터가 손상되었거나 불완전합니다.' },
              { status: 400 }
            );
          }
          
          imageData = `data:image/png;base64,${base64String}`;
        } else if (agent.imageData.type === 'Buffer' && agent.imageData.data) {
          // Buffer 객체가 JSON으로 직렬화된 경우
          console.log('직렬화된 Buffer 객체 감지');
          const buffer = Buffer.from(agent.imageData.data);
          if (buffer.length < 100) {
            console.error('이미지 데이터가 너무 작음:', buffer.length, '바이트');
            return NextResponse.json(
              { error: '이미지 데이터가 손상되었거나 불완전합니다.' },
              { status: 400 }
            );
          }
          
          const base64String = buffer.toString('base64');
          imageData = `data:image/png;base64,${base64String}`;
          console.log('이미지 데이터 변환 (직렬화된 Buffer -> base64 URL)');
          console.log('변환된 base64 길이:', base64String.length);
        } else {
          // 기타 객체 형태 - 키와 값으로 구성된 객체일 수 있음
          console.log('알 수 없는 객체 형태의 이미지 데이터');
          console.log('객체 키들:', Object.keys(agent.imageData));
          
          // 숫자 키로 구성된 객체인지 확인 (배열과 유사한 형태)
          const keys = Object.keys(agent.imageData);
          const isNumericKeys = keys.every(key => !isNaN(parseInt(key)));
          
          if (isNumericKeys) {
            console.log('숫자 키 객체를 배열로 변환');
            const values = keys.map(key => agent.imageData[key]);
            const base64String = String.fromCharCode(...values);
            console.log('변환된 base64 문자열 길이:', base64String.length);
            console.log('변환된 base64 샘플:', base64String.substring(0, 50) + '...');
            
            if (base64String.length < 100) {
              console.error('변환된 base64 데이터가 너무 작음:', base64String.length, '문자');
              return NextResponse.json(
                { error: '이미지 데이터가 손상되었거나 불완전합니다.' },
                { status: 400 }
              );
            }
            
            imageData = `data:image/png;base64,${base64String}`;
          } else {
            console.error('지원되지 않는 객체 형태의 이미지 데이터');
            return NextResponse.json(
              { error: '지원되지 않는 이미지 형식입니다.' },
              { status: 400 }
            );
          }
        }
      } else if (agent.imageData && (agent.imageData.type === 'Buffer' || Array.isArray(agent.imageData))) {
        // JSON으로 직렬화된 버퍼 객체인 경우
        const buffer = Buffer.from(agent.imageData);
        if (buffer.length < 100) {
          console.error('이미지 데이터가 너무 작음:', buffer.length, '바이트');
          return NextResponse.json(
            { error: '이미지 데이터가 손상되었거나 불완전합니다.' },
            { status: 400 }
          );
        }
        
        const base64String = buffer.toString('base64');
        imageData = `data:image/png;base64,${base64String}`;
        console.log('이미지 데이터 변환 (Buffer -> base64 URL)');
        console.log('변환된 base64 길이:', base64String.length);
      } else {
        console.log('알 수 없는 이미지 데이터 형식:', typeof agent.imageData);
        console.log('이미지 데이터 내용:', agent.imageData);
        return NextResponse.json(
          { error: '지원되지 않는 이미지 형식입니다.' },
          { status: 400 }
        );
      }
      
      // 이미지 데이터 유효성 검증
      if (!imageData || !imageData.includes('base64,')) {
        console.error('유효하지 않은 이미지 데이터 형식');
        return NextResponse.json(
          { error: '유효하지 않은 이미지 데이터 형식입니다.' },
          { status: 400 }
        );
      }
      
      // base64 데이터 길이 확인
      const base64Part = imageData.split('base64,')[1];
      if (base64Part.length < 100) {
        console.error('이미지 데이터가 너무 짧음:', base64Part.length, '문자');
        console.error('이미지 데이터 내용:', base64Part);
        return NextResponse.json(
          { error: '이미지 데이터가 손상되었거나 불완전합니다.' },
          { status: 400 }
        );
      }
      
      console.log('이미지 데이터 반환 성공');
      console.log('최종 데이터 길이:', imageData.length);
      console.log('최종 데이터 샘플:', imageData.substring(0, 50) + '...');
      
      // 이미지 데이터 반환
      return NextResponse.json({ 
        imageData,
        format: 'data-url',
        size: imageData.length
      });
      
    } catch (error) {
      console.error('이미지 데이터 처리 중 오류:', error);
      return NextResponse.json(
        { error: '이미지 데이터 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to fetch agent image:', error);
    return NextResponse.json(
      { error: '에이전트 이미지를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 