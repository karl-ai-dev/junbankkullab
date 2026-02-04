# Architecture

전반꿀 연구소 프로젝트의 아키텍처 문서입니다.

## 설계 원칙

### 1. Feature-based + Layer Separation

기능(feature) 단위로 코드를 구성하되, 공용 모듈은 별도 레이어로 분리합니다.

```
src/
├── app/           # Routing Layer (Next.js)
├── features/      # Feature Modules
└── shared/        # Shared Modules
```

### 2. 관심사 분리 (Separation of Concerns)

각 레이어는 명확한 책임을 가집니다:

| 레이어 | 책임 |
|--------|------|
| `app/` | 라우팅, 레이아웃, 페이지 구성 |
| `features/` | 기능별 컴포넌트, 훅, 로직 |
| `shared/` | 재사용 가능한 공용 코드 |

### 3. Colocation (같이 두기)

관련된 파일은 가까이 둡니다:
- feature의 컴포넌트, 훅, 타입은 같은 폴더에
- 2개 이상 feature에서 사용하면 `shared/`로 승격

---

## 디렉토리 구조

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── analyze/route.ts      # 제목 분석 API
│   │   ├── stats/route.ts        # 통계 조회 API
│   │   └── videos/route.ts       # 영상 목록 API
│   ├── layout.tsx                # 루트 레이아웃
│   ├── page.tsx                  # 메인 페이지
│   └── globals.css               # 글로벌 스타일
│
├── features/                     # 기능별 모듈
│   ├── predictions/              # 예측 분석 기능
│   │   ├── components/
│   │   │   ├── LatestPrediction.tsx   # 최신 예측 카드 + 투표
│   │   │   └── RecentPredictions.tsx  # 예측 히스토리 테이블
│   │   └── index.ts              # Public exports
│   │
│   ├── honey-index/              # 꿀지수 기능
│   │   ├── components/
│   │   │   ├── HoneyIndex.tsx         # 메인 꿀지수 표시
│   │   │   └── HoneyIndexChart.tsx    # 꿀지수 추이 차트
│   │   ├── lib/                  # (예정) 꿀지수 계산 로직
│   │   └── index.ts
│   │
│   ├── voting/                   # 투표 기능 (확장 예정)
│   │   ├── hooks/
│   │   │   └── useVote.ts        # (예정) 투표 로직 분리
│   │   └── index.ts
│   │
│   └── assets/                   # 종목별 통계
│       ├── components/
│       │   └── AssetStats.tsx    # 종목별 지수 카드
│       └── index.ts
│
└── shared/                       # 공용 모듈
    ├── components/               # 공통 UI
    │   ├── Header.tsx            # 헤더 컴포넌트
    │   └── index.ts
    │
    ├── lib/                      # 유틸리티
    │   ├── youtube.ts            # YouTube API 클라이언트
    │   ├── market.ts             # 시장 데이터 fetching
    │   ├── analyzer.ts           # 제목 감성 분석
    │   └── index.ts
    │
    └── types/                    # 공용 타입
        └── index.ts              # Prediction, AssetStat 등
```

---

## 데이터 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                      Data Collection                         │
│  (scripts/collect.ts - 크론 또는 수동 실행)                    │
│                                                              │
│  1. YouTube API → 영상 메타데이터                              │
│  2. analyzer.ts → 제목에서 예측 방향 추출                       │
│  3. yfinance → 실제 시장 데이터 조회                           │
│  4. 비교 → 꿀지수 계산                                        │
│  5. data/predictions.json 저장                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       API Layer                              │
│                                                              │
│  /api/stats  → data/predictions.json 읽기 → JSON 응답        │
│  /api/videos → YouTube API 직접 호출 (실시간)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Frontend                                │
│                                                              │
│  page.tsx                                                    │
│    ├── HoneyIndex (전체 꿀지수)                               │
│    ├── HoneyIndexChart (차트)                                │
│    ├── LatestPrediction (최신 예측 + 투표)                    │
│    ├── AssetStats (종목별)                                   │
│    └── RecentPredictions (히스토리)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 기술 결정

### Next.js App Router 선택

- **이유**: 서버 컴포넌트 기본, API Routes 내장, Vercel 배포 용이
- **트레이드오프**: 클라이언트 상태 관리가 약간 복잡

### Feature-based 구조 선택

- **이유**: 기능 단위 응집도 높음, 코드 탐색 용이
- **트레이드오프**: 초기 설정 비용, 작은 프로젝트에는 오버엔지니어링 가능
- **결정**: 프로젝트 성장 대비해 초기부터 적용

### Recharts + CSS 변수

- **문제**: Recharts는 CSS 변수를 SVG에서 해석 못함
- **해결**: 차트 컴포넌트에서 직접 hex 값 사용
- **참고**: `HoneyIndexChart.tsx`의 `COLORS` 객체

### 투표 데이터 localStorage

- **현재**: localStorage로 투표 저장 (프로토타입)
- **향후**: 서버 DB로 마이그레이션 예정

---

## Import 규칙

```tsx
// ✅ Good: feature에서 public export 사용
import { HoneyIndex } from '@/features/honey-index'
import { Header } from '@/shared/components'

// ❌ Bad: 내부 경로 직접 참조
import { HoneyIndex } from '@/features/honey-index/components/HoneyIndex'

// ✅ Good: shared/lib 사용
import { analyzeTitle } from '@/shared/lib/analyzer'
```

---

## 확장 계획

### 단기

- [ ] `features/voting/` 완성 (useVote 훅 분리)
- [ ] `features/honey-index/lib/` 계산 로직 분리
- [ ] 테스트 추가 (핵심 로직)

### 중기

- [ ] 서버 DB 마이그레이션 (투표, 사용자)
- [ ] 실시간 업데이트 (WebSocket 또는 polling)
- [ ] 다크/라이트 테마 토글

### 장기

- [ ] 알림 기능 (새 예측 시)
- [ ] 사용자 예측 기록/통계
- [ ] 다른 채널 확장 (삼프로TV 등)
