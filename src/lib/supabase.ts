/**
 * Supabase 클라이언트 설정
 * 
 * 사용처:
 * - 투표 기능 (votes 테이블)
 * - 예측 데이터 조회 (predictions 테이블)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================
// 타입 정의
// ============================================================

export interface Prediction {
  id: string
  video_id: string
  title: string
  published_at: string
  thumbnail_url: string | null
  predicted_tone: 'positive' | 'negative' | 'neutral' | null
  detected_assets: Array<{
    asset: string
    ticker: string
    confidence: number
  }>
  analysis_reasoning: string | null
  status: 'pending' | 'resolved'
  voting_deadline: string | null
  actual_direction: 'up' | 'down' | 'flat' | null
  price_change: number | null
  is_honey: boolean | null
  resolved_at: string | null
  created_at: string
}

export interface Vote {
  id: string
  prediction_id: string
  session_id: string
  vote: 'bullish' | 'bearish'
  created_at: string
}

export interface VoteStats {
  bullish: number
  bearish: number
  total: number
}

// ============================================================
// 세션 관리 (익명 투표용)
// ============================================================

const SESSION_KEY = 'jbk_session_id'

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

// ============================================================
// API 함수
// ============================================================

/**
 * 투표하기
 */
export async function castVote(
  predictionId: string, 
  vote: 'bullish' | 'bearish'
): Promise<{ success: boolean; error?: string }> {
  const sessionId = getSessionId()
  
  const { error } = await supabase
    .from('votes')
    .upsert({
      prediction_id: predictionId,
      session_id: sessionId,
      vote,
    }, {
      onConflict: 'prediction_id,session_id'
    })
  
  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * 내 투표 조회
 */
export async function getMyVote(predictionId: string): Promise<'bullish' | 'bearish' | null> {
  const sessionId = getSessionId()
  
  const { data } = await supabase
    .from('votes')
    .select('vote')
    .eq('prediction_id', predictionId)
    .eq('session_id', sessionId)
    .single()
  
  return data?.vote ?? null
}

/**
 * 투표 통계 조회
 */
export async function getVoteStats(predictionId: string): Promise<VoteStats> {
  const { data } = await supabase
    .from('votes')
    .select('vote')
    .eq('prediction_id', predictionId)
  
  const votes = data ?? []
  const bullish = votes.filter(v => v.vote === 'bullish').length
  const bearish = votes.filter(v => v.vote === 'bearish').length
  
  return { bullish, bearish, total: bullish + bearish }
}

/**
 * 진행 중인 예측 목록
 */
export async function getPendingPredictions(): Promise<Prediction[]> {
  const { data } = await supabase
    .from('predictions')
    .select('*')
    .eq('status', 'pending')
    .order('published_at', { ascending: false })
  
  return data ?? []
}

/**
 * 완료된 예측 목록
 */
export async function getResolvedPredictions(limit = 20): Promise<Prediction[]> {
  const { data } = await supabase
    .from('predictions')
    .select('*')
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: false })
    .limit(limit)
  
  return data ?? []
}
