/**
 * Shared type definitions for the Junbankkullab project
 */

/** Prediction direction from video analysis */
export type PredictionDirection = 'bullish' | 'bearish'

/** Actual market direction after prediction */
export type MarketDirection = 'up' | 'down' | 'pending'

/** Individual prediction record */
export interface Prediction {
  id: string
  videoId: string
  title: string
  thumbnail: string
  publishedAt: string
  asset: string
  predictedDirection: PredictionDirection
  actualDirection: MarketDirection
  priceChange?: number
  isHoney: boolean | null
}

/** Asset-specific statistics */
export interface AssetStat {
  asset: string
  honeyIndex: number
  predictions: number
}

/** Overall statistics response */
export interface StatsResponse {
  overallHoneyIndex: number
  totalPredictions: number
  assetStats: AssetStat[]
  recentPredictions: Prediction[]
  collectedAt: string | null
}

/** Video from YouTube API */
export interface Video {
  id: string
  title: string
  thumbnail: string
  publishedAt: string
  description?: string
}

/** Analysis result from title analyzer */
export interface TitleAnalysis {
  asset: string | null
  sentiment: PredictionDirection | null
  confidence: number
  keywords: string[]
}
