---
noteId: "d37676407f5111f092388bc1449f93c2"
tags: []

---

# RAG (Retrieval-Augmented Generation) System

## 환경변수 설정

RAG 시스템을 사용하기 위해 다음 환경변수를 설정해야 합니다:

```bash
# 임베딩 전용 API 키 (권장)
# 이 키는 임베딩 생성에만 사용되며, 메인 OpenAI API 키와 분리하여 비용 추적이 용이합니다
OPENAI_EMBEDDING_API_KEY=sk-...

# 만약 OPENAI_EMBEDDING_API_KEY가 설정되지 않은 경우, 
# 시스템은 자동으로 OPENAI_API_KEY를 대체로 사용합니다
OPENAI_API_KEY=sk-...
```

## 왜 별도의 임베딩 API 키를 사용하나요?

1. **비용 추적**: 임베딩 API 호출은 RAG 시스템에서 매우 빈번하게 발생합니다. 별도의 키를 사용하면 임베딩 관련 비용을 쉽게 추적할 수 있습니다.

2. **Rate Limit 관리**: 임베딩과 일반 API 호출의 rate limit을 독립적으로 관리할 수 있습니다.

3. **보안**: 필요에 따라 임베딩 키에만 특정 권한을 부여하거나 제한을 설정할 수 있습니다.

4. **모니터링**: 임베딩 사용량을 별도로 모니터링하고 최적화할 수 있습니다.

## 벡터 데이터베이스 설정

### ChromaDB
```bash
CHROMA_URL=http://localhost:8000
CHROMA_API_KEY=your-api-key  # 인증이 필요한 경우
```

### PostgreSQL with pgvector
```bash
PGVECTOR_URL=postgresql://user:password@localhost:5432/vectordb
```

### Faiss (로컬)
```bash
FAISS_DATA_PATH=./data/faiss
```

## 사용 예시

### 1. 임베딩 생성
```typescript
import { EmbeddingProviderFactory } from '@/lib/rag';

const provider = EmbeddingProviderFactory.create({
  provider: 'openai',
  model: 'text-embedding-ada-002',
  // If apiKey is not specified, it will automatically read from environment variables
});

const embedding = await provider.generateEmbedding("텍스트");
```

### 2. 벡터 스토어 생성
```typescript
import { VectorStoreFactory } from '@/lib/rag';

const store = await VectorStoreFactory.create({
  type: 'chromadb',
  connectionString: process.env.CHROMA_URL,
  apiKey: process.env.CHROMA_API_KEY,
});
```

## 문서 처리 파이프라인

1. **문서 업로드**: PDF, Word, PowerPoint 등 다양한 형식 지원
2. **텍스트 추출**: 파일 형식에 맞는 파서 사용
3. **데이터 클린징**: 헤더/푸터 제거, 인코딩 수정, LLM 기반 정제
4. **청킹**: 문서를 의미 있는 단위로 분할
5. **임베딩 생성**: OpenAI 임베딩 API 사용
6. **벡터 저장**: 선택한 벡터 데이터베이스에 저장
7. **검색 가능**: 의미 기반 검색 지원

## API 엔드포인트

- `POST /api/rag/vector-stores` - 벡터 스토어 생성
- `POST /api/rag/collections` - 컬렉션 생성
- `POST /api/rag/documents` - 문서 업로드
- `POST /api/rag/search` - 검색

## 비용 최적화 팁

1. **적절한 청킹 크기**: 너무 작으면 임베딩 호출이 많아지고, 너무 크면 검색 정확도가 떨어집니다.
2. **캐싱**: 동일한 텍스트에 대한 임베딩은 캐싱하여 재사용
3. **배치 처리**: 가능한 여러 텍스트를 한 번에 임베딩
4. **모델 선택**: `text-embedding-3-small`은 저렴하면서도 좋은 성능 제공
