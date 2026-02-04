# CLAUDE.md - AI Agent Context

> 이 파일은 AI 코딩 에이전트가 프로젝트를 빠르게 이해할 수 있도록 작성되었습니다.

## ⚠️ 필수 참조

**새 기능 추가, 파일 생성, 코드 구조 변경 시 반드시 아래 파일을 먼저 읽으세요:**

- `.claude/skills/junbankkullab-architecture/SKILL.md` — 아키텍처 규칙
- `ARCHITECTURE.md` — 전체 구조 및 확장 계획

## 프로젝트 개요

**전반꿀 연구소 (JunBanKkul Lab)** - "전인구 반대로 하면 꿀" 밈을 데이터로 검증하는 웹사이트

- 전인구경제연구소 유튜브 영상에서 시장 예측 방향 추출
- 실제 시장 데이터(주식, 암호화폐)와 비교
- 역상관관계(전반꿀 지수) 통계 시각화

## 주요 명령어

```bash
pnpm dev        # 개발 서버 (localhost:3000)
pnpm build      # 프로덕션 빌드
pnpm start      # 프로덕션 서버
pnpm lint       # ESLint 검사
pnpm collect    # 데이터 수집 스크립트 (tsx scripts/collect.ts)
```

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Charts**: Recharts 3.x
- **Backend**: Next.js API Routes
- **Scripts**: tsx (TypeScript 실행)

## 디렉토리 구조

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API Routes
│   │   ├── analyze/        # 분석 API
│   │   ├── stats/          # 통계 API
│   │   └── videos/         # 영상 데이터 API
│   ├── layout.tsx          # 루트 레이아웃
│   └── page.tsx            # 메인 페이지
│
├── features/               # Feature-based modules (권장)
│   ├── assets/             # 종목별 통계
│   │   └── components/
│   ├── honey-index/        # 전반꿀 지수 관련
│   │   └── components/
│   ├── predictions/        # 예측 결과
│   │   └── components/
│   └── voting/             # 투표 기능 (예정)
│
├── shared/                 # 공유 모듈
│   ├── components/         # 공통 컴포넌트 (Header 등)
│   ├── lib/                # 유틸리티
│   │   ├── youtube.ts      # YouTube API 클라이언트
│   │   ├── market.ts       # 시장 데이터 fetching
│   │   └── analyzer.ts     # 감성 분석
│   └── types/              # 공유 타입 정의
│
scripts/                    # 데이터 수집 스크립트
data/                       # 수집된 데이터 (gitignored)
```

## 코딩 컨벤션 요약

### TypeScript
- `strict: true` 활성화
- 타입 추론 가능하면 명시적 타입 생략
- `any` 금지, 필요시 `unknown` 사용

### React
- 함수형 컴포넌트 only (FC 타입 사용 X)
- Props는 interface로 정의
- 서버 컴포넌트 우선, 필요시 `'use client'`

### 파일/폴더 네이밍
- 컴포넌트: `PascalCase.tsx` (예: `HoneyIndexChart.tsx`)
- 유틸/훅: `camelCase.ts` (예: `useMarketData.ts`)
- 타입: `types.ts` 또는 `index.ts`에서 export

### 스타일
- Tailwind CSS 사용
- 커스텀 CSS 최소화

## ⚠️ 주의사항

### Recharts + CSS 변수
**Recharts는 CSS 변수(`var(--color)`)를 직접 지원하지 않습니다!**

```tsx
// ❌ 작동 안 함
<Line stroke="var(--primary)" />
<Area fill="hsl(var(--chart-1))" />

// ✅ 직접 색상값 사용
<Line stroke="#3b82f6" />
<Area fill="hsl(221.2, 83.2%, 53.3%)" />

// ✅ 또는 JS에서 계산
const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--primary').trim();
```

### Import 경로
```tsx
// ✅ 절대 경로 사용 (@/ alias)
import { analyzer } from '@/shared/lib/analyzer';

// ❌ 상대 경로 지양
import { analyzer } from '../../../shared/lib/analyzer';
```

### API Routes
- `src/app/api/` 내에 위치
- `route.ts` 파일명 사용
- Response는 `NextResponse.json()` 사용

## 환경 변수

```bash
# .env.local
YOUTUBE_API_KEY=your_api_key_here
```

## 참고 링크

- [Next.js App Router](https://nextjs.org/docs/app)
- [Recharts](https://recharts.org/)
- [Tailwind CSS](https://tailwindcss.com/)
