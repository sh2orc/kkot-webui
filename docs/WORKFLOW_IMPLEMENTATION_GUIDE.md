# 워크플로우 시스템 구현 가이드

## 🎯 개요

이 문서는 kkot-webui 프로젝트에 워크플로우 시스템을 구현하기 위한 가이드입니다. Langflow와 LangGraph를 참고하여 시각적 노드 기반 워크플로우 에디터를 구현했습니다.

## 🏗️ 아키텍처

### 1. 핵심 구성 요소

- **비주얼 에디터**: ReactFlow 기반 드래그 앤 드롭 노드 에디터
- **노드 시스템**: 확장 가능한 노드 타입과 실행 엔진
- **실행 엔진**: 비동기 워크플로우 실행 및 상태 관리
- **데이터베이스**: 워크플로우 정의 및 실행 이력 저장

### 2. 주요 기능

- 🎨 시각적 워크플로우 디자인
- 🔧 다양한 노드 타입 (AI, 데이터 처리, 제어 흐름 등)
- ⚡ 실시간 워크플로우 실행
- 💾 워크플로우 저장 및 버전 관리
- 📊 실행 이력 및 모니터링
- 🎯 템플릿 시스템

## 📁 파일 구조

```
/lib/workflow/
├── types.ts                 # 타입 정의
├── execution-engine.ts      # 실행 엔진
├── nodes/
│   ├── index.ts            # 노드 베이스 클래스 및 팩토리
│   ├── llm-agent-node.ts   # LLM 에이전트 노드
│   ├── rag-search-node.ts  # RAG 검색 노드
│   ├── prompt-template-node.ts
│   ├── conditional-node.ts
│   ├── http-request-node.ts
│   ├── user-input-node.ts
│   └── response-node.ts
└── /lib/db/
    ├── schema-workflow.ts   # 워크플로우 DB 스키마
    └── migrations/
        └── workflow_schema.sql

/app/admin/workflow/
├── page.tsx                 # 메인 페이지
└── components/
    ├── workflow-editor.tsx  # 에디터 컴포넌트
    ├── node-panel.tsx       # 노드 라이브러리
    ├── custom-node.tsx      # 커스텀 노드 UI
    ├── node-config-panel.tsx # 노드 설정 패널
    ├── workflow-list.tsx    # 워크플로우 목록
    └── workflow-templates.tsx # 템플릿 갤러리

/app/api/workflow/
├── route.ts                 # CRUD API
└── execute/
    └── route.ts            # 실행 API
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install reactflow
```

### 2. 데이터베이스 마이그레이션

```bash
npm run db:migrate
```

### 3. 워크플로우 페이지 접근

관리자로 로그인 후 `/admin/workflow` 페이지로 이동

## 💡 노드 타입

### 입력 노드
- **사용자 입력**: 텍스트 입력 받기
- **파일 업로드**: 파일 처리
- **API 트리거**: API 호출로 시작

### AI 처리 노드
- **LLM 에이전트**: AI 모델 활용
- **RAG 검색**: 벡터 DB 검색
- **딥 리서치**: 심층 연구
- **웹 검색**: 인터넷 검색

### 데이터 변환 노드
- **텍스트 처리**: 문자열 변환
- **JSON 파서**: JSON 파싱
- **프롬프트 템플릿**: 동적 프롬프트

### 제어 흐름 노드
- **조건 분기**: if/else 로직
- **반복**: 루프 처리
- **병렬 처리**: 동시 실행

### 출력 노드
- **응답**: 결과 반환
- **데이터베이스**: DB 작업
- **웹훅**: 외부 시스템 연동

## 🔧 커스텀 노드 추가하기

### 1. 노드 타입 정의

```typescript
// lib/workflow/types.ts
export enum NodeType {
  // ... 기존 노드들
  MY_CUSTOM_NODE = 'my_custom_node'
}
```

### 2. 노드 클래스 구현

```typescript
// lib/workflow/nodes/my-custom-node.ts
import { BaseNode, ExecutionContext } from './index'

export class MyCustomNode extends BaseNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    // 노드 로직 구현
    return result
  }
  
  validateInput(input: any): void {
    // 입력 검증
  }
}
```

### 3. 노드 팩토리에 등록

```typescript
// lib/workflow/nodes/index.ts
case NodeType.MY_CUSTOM_NODE:
  return new MyCustomNode(workflowNode)
```

### 4. UI에 노드 추가

```typescript
// app/admin/workflow/components/node-panel.tsx
{
  type: NodeType.MY_CUSTOM_NODE,
  label: "내 커스텀 노드",
  icon: MyIcon,
  description: "설명"
}
```

## 📊 워크플로우 실행 플로우

1. **워크플로우 생성**: 비주얼 에디터에서 노드 배치
2. **노드 연결**: 드래그로 노드 간 연결
3. **설정**: 각 노드 클릭하여 설정
4. **저장**: 워크플로우 저장
5. **실행**: 입력 데이터와 함께 실행
6. **모니터링**: 실행 상태 확인

## 🔍 API 엔드포인트

### 워크플로우 CRUD

```bash
# 목록 조회
GET /api/workflow

# 생성
POST /api/workflow
{
  "name": "워크플로우 이름",
  "description": "설명",
  "nodes": [...],
  "edges": [...]
}

# 수정
PUT /api/workflow
{
  "workflowId": "workflow_xxx",
  "name": "수정된 이름",
  ...
}
```

### 워크플로우 실행

```bash
# 실행
POST /api/workflow/execute
{
  "workflowId": "workflow_xxx",
  "input": {
    "message": "입력 데이터"
  }
}

# 실행 상태 조회
GET /api/workflow/execute?executionId=xxx
```

## 🎨 UI 커스터마이징

### 노드 스타일 변경

```typescript
// app/admin/workflow/components/custom-node.tsx
const nodeColors: Record<NodeType, string> = {
  [NodeType.MY_NODE]: 'border-custom-color bg-custom-bg',
}
```

### 노드 아이콘 변경

```typescript
const nodeIcons: Record<NodeType, LucideIcon> = {
  [NodeType.MY_NODE]: MyCustomIcon,
}
```

## 🔒 보안 고려사항

1. **권한 검증**: 모든 API에서 사용자 권한 확인
2. **입력 검증**: 노드 실행 전 입력 데이터 검증
3. **실행 제한**: 무한 루프 방지 및 타임아웃 설정
4. **리소스 제한**: 메모리 및 CPU 사용량 모니터링

## 🚦 향후 개선 사항

1. **실시간 협업**: 여러 사용자가 동시 편집
2. **버전 관리**: 워크플로우 버전 히스토리
3. **디버깅 도구**: 단계별 실행 및 중단점
4. **성능 최적화**: 대용량 워크플로우 처리
5. **고급 노드**: ML 모델, 데이터 분석 노드
6. **워크플로우 마켓플레이스**: 커뮤니티 템플릿 공유

## 📝 주의사항

1. ReactFlow 라이선스 확인 필요
2. 대용량 워크플로우의 경우 성능 최적화 필요
3. 순환 참조 감지 로직 추가 권장
4. 에러 핸들링 및 복구 메커니즘 강화 필요

## 🤝 기여하기

워크플로우 시스템 개선에 기여하려면:

1. 새로운 노드 타입 추가
2. 실행 엔진 최적화
3. UI/UX 개선
4. 테스트 케이스 작성
5. 문서화 개선

---

이 가이드는 기본적인 워크플로우 시스템 구현을 다룹니다. 실제 프로덕션 환경에서는 추가적인 최적화와 보안 강화가 필요합니다.
