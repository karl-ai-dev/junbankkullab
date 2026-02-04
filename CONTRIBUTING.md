# Contributing Guide

전반꿀 연구소에 기여해주셔서 감사합니다! 🍯

## 코딩 스타일

### TypeScript

- **Strict mode**: `tsconfig.json`에서 `strict: true` 활성화됨
- **타입 안전성**: `any` 사용 금지, 필요시 `unknown` + type guard
- **타입 추론**: 명확히 추론 가능하면 명시적 타입 생략

```typescript
// ✅ Good
const count = 0;
const items = videos.map(v => v.title);

// ❌ Bad
const count: number = 0;
const items: string[] = videos.map((v: Video): string => v.title);
```

### React 컴포넌트

- **함수형 컴포넌트만 사용**
- **`React.FC` 타입 사용 금지** (암묵적 children, 제네릭 제한 문제)
- **Props는 interface로 정의**

```tsx
// ✅ Good
interface HoneyIndexChartProps {
  data: DataPoint[];
  title?: string;
}

export function HoneyIndexChart({ data, title }: HoneyIndexChartProps) {
  return <div>...</div>;
}

// ❌ Bad
export const HoneyIndexChart: React.FC<Props> = ({ data, title }) => {
  return <div>...</div>;
};
```

### 서버 vs 클라이언트 컴포넌트

```tsx
// 서버 컴포넌트 (기본) - 데이터 fetching, static rendering
export default async function Page() {
  const data = await fetchData();
  return <Component data={data} />;
}

// 클라이언트 컴포넌트 - 상호작용, hooks, browser APIs
'use client';

export function InteractiveChart({ data }: Props) {
  const [selected, setSelected] = useState(null);
  // ...
}
```

## 네이밍 컨벤션

### 파일명

| 타입 | 컨벤션 | 예시 |
|------|--------|------|
| 컴포넌트 | PascalCase | `HoneyIndexChart.tsx` |
| 유틸리티 | camelCase | `formatDate.ts` |
| 훅 | camelCase (use 접두사) | `useMarketData.ts` |
| 타입 정의 | camelCase | `types.ts` |
| 상수 | camelCase | `constants.ts` |

### 변수/함수

```typescript
// 변수: camelCase
const videoCount = 10;
const isLoading = false;

// 함수: camelCase, 동사로 시작
function fetchVideos() {}
function calculateHoneyIndex() {}
function formatCurrency() {}

// 상수: SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_COUNT = 3;

// 타입/인터페이스: PascalCase
interface VideoData {}
type AnalysisResult = {}
```

### 디렉토리

```
features/
  honey-index/           # kebab-case
    components/
      HoneyIndexChart.tsx
    hooks/
      useHoneyIndex.ts
    types.ts
    index.ts             # barrel export
```

## 커밋 메시지 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 사용

### 형식

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | 설명 |
|------|------|
| `feat` | 새로운 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 변경 |
| `style` | 코드 포맷팅 (로직 변경 X) |
| `refactor` | 리팩토링 (기능 변경 X) |
| `perf` | 성능 개선 |
| `test` | 테스트 추가/수정 |
| `chore` | 빌드, 설정 등 기타 |

### 예시

```bash
feat(honey-index): add weekly trend chart

fix(api): handle rate limit errors from YouTube API

refactor(components): migrate to feature-based architecture

docs: add CONTRIBUTING.md
```

### Scope (선택)

- `honey-index`, `predictions`, `assets`, `voting`
- `api`, `components`, `lib`
- `deps`, `config`

## Pull Request 규칙

### PR 제목

커밋 메시지와 동일한 형식:
```
feat(honey-index): add comparison feature
```

### PR 체크리스트

- [ ] 코드가 빌드됨 (`pnpm build`)
- [ ] Lint 에러 없음 (`pnpm lint`)
- [ ] 관련 타입 정의 추가됨
- [ ] 필요시 문서 업데이트됨

### PR 설명 템플릿

```markdown
## 변경 사항
<!-- 무엇을 변경했는지 -->

## 관련 이슈
<!-- Closes #123 -->

## 스크린샷 (UI 변경시)
<!-- 변경 전/후 스크린샷 -->

## 테스트
<!-- 어떻게 테스트했는지 -->
```

## 브랜치 전략

### 브랜치 타입

| 브랜치 | 용도 |
|--------|------|
| `main` | 프로덕션 브랜치 (보호됨) |
| `feature/*` | 새 기능 개발 |
| `fix/*` | 버그 수정 |
| `refactor/*` | 리팩토링 |
| `docs/*` | 문서 작업 |

### 브랜치 네이밍

```bash
feature/add-voting-system
feature/honey-index-weekly-view
fix/chart-rendering-issue
fix/api-timeout
refactor/architecture-v2
refactor/component-structure
docs/api-documentation
```

### 워크플로우

```bash
# 1. main에서 브랜치 생성
git checkout main
git pull origin main
git checkout -b feature/my-feature

# 2. 작업 및 커밋
git add .
git commit -m "feat(scope): description"

# 3. Push 및 PR 생성
git push origin feature/my-feature
# GitHub에서 PR 생성

# 4. 리뷰 후 main에 merge
# PR 승인 후 Squash and Merge 권장
```

## 디렉토리 구조 규칙

### Feature Module 구조

```
src/features/honey-index/
├── components/          # Feature 전용 컴포넌트
│   ├── HoneyIndexChart.tsx
│   └── HoneyIndexCard.tsx
├── hooks/               # Feature 전용 훅
│   └── useHoneyIndex.ts
├── api/                 # Feature 전용 API 함수
│   └── fetchHoneyIndex.ts
├── types.ts             # Feature 전용 타입
├── constants.ts         # Feature 전용 상수
└── index.ts             # Barrel export
```

### Barrel Export

```typescript
// src/features/honey-index/index.ts
export { HoneyIndexChart } from './components/HoneyIndexChart';
export { HoneyIndexCard } from './components/HoneyIndexCard';
export { useHoneyIndex } from './hooks/useHoneyIndex';
export type { HoneyIndexData } from './types';
```

### Import 규칙

```typescript
// ✅ Feature 내부에서는 상대 경로
// src/features/honey-index/components/HoneyIndexChart.tsx
import { useHoneyIndex } from '../hooks/useHoneyIndex';
import type { HoneyIndexData } from '../types';

// ✅ Feature 외부에서는 barrel export 사용
// src/app/page.tsx
import { HoneyIndexChart } from '@/features/honey-index';

// ✅ Shared 모듈은 절대 경로
import { formatDate } from '@/shared/lib/formatDate';
```

## 질문이 있으신가요?

이슈를 생성하거나 Discussion에 질문해주세요!
