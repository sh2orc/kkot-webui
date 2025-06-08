# 🌸 KKOT WebUI

**다양한 LLM 서비스를 위한 통합 웹 인터페이스**

KKOT WebUI는 OpenAI, Gemini, Ollama, vLLM 등 다양한 대형 언어 모델(LLM) 서비스들에 대해 직관적이고 사용하기 쉬운 웹 인터페이스를 제공하는 오픈소스 프로젝트입니다.

## ✨ 주요 기능

### 🤖 다중 LLM 지원
- **OpenAI API**: GPT-4o 등 OpenAI 모델 지원
- **Google Gemini**: Gemini API 통합
- **Ollama**: 로컬 Ollama 서버 연결
- **기타 모델**: Claude, LLaMA, Mistral 등 다양한 모델 지원

### 💬 채팅 인터페이스
- 실시간 대화형 채팅 UI
- 메시지 복사, 좋아요/싫어요, 재생성 기능
- 사용자 메시지 편집 기능
- 반응형 디자인으로 모바일/데스크톱 지원

### ⚙️ 관리자 설정
- 다중 API 서버 관리
- 모델별 세부 설정 (토큰 수, Temperature 등)
- 인터넷 검색 기능 통합
- 이미지 생성 API 연동 (DALL-E, Midjourney 등)
- 음성 인식 및 TTS 설정

### 🎨 현대적인 UI/UX
- Tailwind CSS 기반의 깔끔한 디자인
- Radix UI 컴포넌트 활용
- 다크/라이트 테마 지원
- 직관적인 네비게이션

## 🚀 빠른 시작

### 필수 요구사항
- Node.js 18.0 이상
- npm, yarn, 또는 pnpm

### 설치 및 실행

1. **저장소 클론**
```bash
git clone https://github.com/your-username/korean-chat-interface.git
cd korean-chat-interface
```

2. **의존성 설치**
```bash
npm install
# 또는
yarn install
# 또는
pnpm install
```

3. **개발 서버 실행**
```bash
npm run dev
# 또는
yarn dev
# 또는
pnpm dev
```

4. **브라우저에서 확인**
http://localhost:3000 에서 애플리케이션을 확인할 수 있습니다.

### 프로덕션 빌드

```bash
npm run build
npm run start
```

## 📁 프로젝트 구조

```
korean-chat-interface/
├── app/                    # Next.js App Router
│   ├── chat/              # 채팅 페이지
│   ├── admin/             # 관리자 설정
│   ├── setting/           # 사용자 설정
│   └── layout.tsx         # 루트 레이아웃
├── components/            # React 컴포넌트
│   ├── chat/              # 채팅 관련 컴포넌트
│   ├── layout/            # 레이아웃 컴포넌트
│   ├── sidebar/           # 사이드바 컴포넌트
│   ├── contents/          # 페이지 컨텐츠
│   └── ui/                # 재사용 가능한 UI 컴포넌트
├── lib/                   # 유틸리티 함수
├── hooks/                 # 커스텀 React 훅
├── styles/                # 스타일 파일
└── public/                # 정적 파일
```

## 🔧 기술 스택

- **프레임워크**: Next.js 15.2.4
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **UI 컴포넌트**: Radix UI
- **아이콘**: Lucide React
- **폼 관리**: React Hook Form + Zod
- **테마**: next-themes

## 🌟 기여하기

이 프로젝트는 완전한 오픈소스이며, 누구나 기여할 수 있습니다. 여러분의 기여를 통해 더 빠르게 많은 기능들을 추가할 수 있습니다!

### 기여 방법

1. 이 저장소를 포크합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

### 기여 가이드라인

- 코드 스타일을 일관성 있게 유지해주세요
- 새로운 기능에 대한 테스트를 작성해주세요
- 문서를 업데이트해주세요
- 이슈를 먼저 확인하고 중복을 피해주세요

## 🎯 로드맵

- [ ] 실시간 스트리밍 응답 지원
- [ ] 대화 히스토리 저장 및 관리
- [ ] 플러그인 시스템 구축
- [ ] 다국어 지원 확장
- [ ] 모바일 앱 개발
- [ ] API 문서 자동 생성
- [ ] 사용자 인증 시스템
- [ ] 팀 협업 기능

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🤝 지원 및 문의

- **이슈 리포트**: [GitHub Issues](https://github.com/your-username/korean-chat-interface/issues)
- **기능 요청**: [GitHub Discussions](https://github.com/your-username/korean-chat-interface/discussions)
- **이메일**: your-email@example.com

## 🙏 감사의 말

이 프로젝트를 더욱 발전시키기 위해 기여해주시는 모든 분들께 진심으로 감사드립니다. 여러분의 도움으로 더 많은 사람들이 AI의 혜택을 누릴 수 있게 됩니다.

---

**KKOT WebUI**로 AI와의 대화를 더욱 쉽고 즐겁게 만들어보세요! 🚀 