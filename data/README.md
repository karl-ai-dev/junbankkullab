# 📊 Data Directory

전반꿀 연구소의 모든 데이터 파일 저장소.

---

## 📁 디렉토리 구조

```
data/
├── api/              # API 응답 캐시 (deprecated)
├── stats/            # 통계 결과 (하이브리드 분석)
├── review/           # 검토 대기 데이터
└── {YYYY}/{MM}/      # 월별 수집 데이터
```

---

## 📂 `api/`

### `latest.json`
> ⚠️ **Deprecated** - 이전 버전 호환용. 현재는 `stats/overall.json` 사용.

- **내용**: 구버전 전체 통계 스냅샷
- **생성**: `scripts/collect.ts` (구버전)
- **사용처**: 없음 (레거시)

---

## 📂 `stats/`

### `hybrid-analysis.json`
> 🎯 **핵심 데이터** - 하이브리드 분석 결과

- **내용**: 종목 언급 + 톤(긍정/부정) 기반 역지표 분석
- **생성**: `scripts/hybrid-analysis.ts` 실행 시 생성
- **사용처**: `src/app/api/stats/route.ts` → GET /api/stats

```typescript
{
  updatedAt: string,           // 마지막 업데이트 시간
  methodology: "hybrid",       // 분석 방법론
  description: string,         // 설명
  stats: {
    totalVideos: number,       // 분석된 총 영상 수
    totalMentions: number,     // 종목 언급 총 횟수
    analyzableMentions: number,// 톤 분석 가능한 언급 수
    validMentions: number,     // 유효 예측 수 (시장 데이터 있음)
    honeyCount: number,        // 역지표 적중 수 (🍯)
    honeyIndex: number,        // 전반꿀 지수 (%)
  },
  assetStats: [{               // 종목별 통계
    asset: string,
    total: number,
    honey: number,
    honeyIndex: number,
  }],
  mentions: [{                 // 개별 언급 목록
    videoId: string,
    title: string,
    publishedAt: string,
    asset: string,
    tone: "positive" | "negative",
    actualDirection: "up" | "down" | "flat" | "no_data",
    isHoney: boolean,
  }]
}
```

### `overall.json`
> 📈 **월별 타임라인** - 기간별 통계

- **내용**: 전체 통계 + 월별 예측 수 및 꿀지수
- **생성**: `scripts/hybrid-analysis.ts`
- **사용처**: `src/app/api/stats/route.ts` → timeline 데이터

```typescript
{
  updatedAt: string,
  methodology: { ... },        // 분석 방법론 설명
  stats: {
    totalPredictions: number,
    honeyCount: number,
    honeyIndex: number,
  },
  assetStats: [...],
  periods: [{                  // 월별 통계
    year: number,
    month: number,
    predictions: number,
    honeyIndex: number,
  }]
}
```

---

## 📂 `review/`

### `neutral-mentions.json`
> 🔍 **검토 대기** - 사람이 레이블링해야 할 항목

- **내용**: 자동 분석에서 톤이 "neutral"로 판정된 언급들
- **생성**: `scripts/extract-neutral.ts`
- **사용처**: `src/app/api/stats/route.ts` → pendingReviews

```typescript
[{
  videoId: string,
  title: string,
  publishedAt: string,
  asset: string,
  url: string,                 // YouTube 링크
}]
```

### `neutral-review.md`
> 📝 **마크다운 버전** - 사람이 읽기 쉬운 형태

- **내용**: neutral-mentions.json을 마크다운 테이블로 정리
- **생성**: `scripts/extract-neutral.ts`
- **사용처**: 수동 검토용 (Doun이 확인)

### `manual-labels.json` (생성 시)
> ✏️ **수동 레이블** - 사람이 분류한 결과

- **내용**: 중립 항목에 대한 수동 레이블 (P/N/S)
- **생성**: 사람이 직접 작성
- **사용처**: `src/app/api/stats/route.ts` → 톤 결정 시 우선 적용

```typescript
{
  "{videoId}_{asset}": "P" | "N" | "S"  // Positive / Negative / Skip
}
```

---

## 📂 `{YYYY}/{MM}/` (월별 데이터)

### `videos.json`
> 🎬 **수집된 영상 목록** - YouTube API 결과

- **내용**: 해당 월에 업로드된 전인구경제연구소 영상
- **생성**: `scripts/collect.ts` 또는 GitHub Actions
- **사용처**: `src/app/api/stats/route.ts` → 최신 영상 조회

```typescript
[{
  id: string,                  // YouTube 영상 ID
  title: string,               // 영상 제목
  thumbnail: string,           // 썸네일 URL
  publishedAt: string,         // 업로드 시간 (ISO 8601)
}]
```

### `predictions.json`
> 🔮 **예측 분석 결과** - 월간 분석 데이터

- **내용**: 해당 월의 종목별 예측 및 검증 결과
- **생성**: `scripts/collect.ts` 또는 `scripts/analyze-2026.ts`
- **사용처**: `scripts/hybrid-analysis.ts`에서 통합 분석

```typescript
{
  period: { year: number, month: number },
  stats: {
    totalVideos: number,
    validPredictions: number,
    honeyCount: number,
    honeyIndex: number,
    assetStats: [...],
  },
  predictions: [{
    videoId: string,
    videoUrl: string,
    title: string,
    thumbnail: string,
    publishedAt: string,
    asset: string,
    symbol: string,
    predictedDirection: "bullish" | "bearish",
    hasNegation: boolean,
    priceAtPublish: number,
    priceAfter24h: number,
    priceChange: number,       // 변화율 (%)
    actualDirection: "bullish" | "bearish" | "neutral",
    isHoney: boolean,          // 역지표 적중 여부
  }]
}
```

---

## 🔄 데이터 흐름

```
YouTube API
    ↓
scripts/collect.ts (또는 GitHub Actions)
    ↓
data/{YYYY}/{MM}/videos.json
data/{YYYY}/{MM}/predictions.json
    ↓
scripts/hybrid-analysis.ts
    ↓
data/stats/hybrid-analysis.json
data/stats/overall.json
    ↓
src/app/api/stats/route.ts
    ↓
프론트엔드 (/api/stats)
```

---

## ⚙️ 자동 수집

GitHub Actions에서 매일 3회 (09:00, 15:00, 21:00 KST) 자동 수집:

1. `npx tsx scripts/collect.ts` - 영상 수집 + 분석
2. `npx tsx scripts/hybrid-analysis.ts` - 하이브리드 분석 업데이트
3. 결과 자동 커밋/푸시
