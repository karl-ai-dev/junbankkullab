'use client'

/**
 * Supabase 연동 투표 카드 컴포넌트
 * 
 * 기능:
 * - 영상별 상승/하락 투표 (Supabase 저장)
 * - 실시간 투표 현황 표시
 * - 결과 확정 시 정답 표시
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  castVote, 
  getMyVote, 
  getVoteStats, 
  type Prediction,
  type VoteStats 
} from '@/lib/supabase'
import { TrendingUp, TrendingDown, Users, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SupabaseVoteCardProps {
  prediction: Prediction
}

export function SupabaseVoteCard({ prediction }: SupabaseVoteCardProps) {
  const [myVote, setMyVote] = useState<'bullish' | 'bearish' | null>(null)
  const [stats, setStats] = useState<VoteStats>({ bullish: 0, bearish: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  const [showStats, setShowStats] = useState(false)
  
  const isResolved = prediction.status === 'resolved'
  const isPending = prediction.status === 'pending'
  
  useEffect(() => {
    loadData()
  }, [prediction.id])
  
  async function loadData() {
    const [vote, voteStats] = await Promise.all([
      getMyVote(prediction.id),
      getVoteStats(prediction.id)
    ])
    setMyVote(vote)
    setStats(voteStats)
    setShowStats(!!vote || isResolved)
  }
  
  async function handleVote(vote: 'bullish' | 'bearish') {
    if (loading || isResolved) return
    
    setLoading(true)
    const result = await castVote(prediction.id, vote)
    
    if (result.success) {
      setMyVote(vote)
      setShowStats(true)
      // 통계 새로고침
      const newStats = await getVoteStats(prediction.id)
      setStats(newStats)
    }
    setLoading(false)
  }
  
  // 주요 자산 표시
  const mainAsset = prediction.detected_assets?.[0]?.asset ?? '종목'
  
  // 전인구 예측 방향
  const jigPrediction = prediction.predicted_tone === 'positive' ? 'bullish' : 'bearish'
  
  // 투표 결과가 정답인지
  const isMyVoteCorrect = isResolved && myVote && (
    (myVote === 'bullish' && prediction.actual_direction === 'up') ||
    (myVote === 'bearish' && prediction.actual_direction === 'down')
  )
  
  // 전인구가 틀렸는지 (역지표 적중)
  const isHoney = prediction.is_honey
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isResolved && isHoney && "ring-2 ring-amber-400 bg-amber-50/50 dark:bg-amber-950/20",
      isResolved && !isHoney && "opacity-75"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">
              {new Date(prediction.published_at).toLocaleDateString('ko-KR')}
            </p>
            <h3 className="font-medium line-clamp-2 mt-1">
              {prediction.title}
            </h3>
          </div>
          {isResolved && (
            <div className={cn(
              "shrink-0 px-2 py-1 rounded text-xs font-bold",
              isHoney 
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" 
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            )}>
              {isHoney ? '🍯 역지표' : '예측대로'}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 전인구 예측 */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">전인구 전망:</span>
          <span className={cn(
            "font-medium",
            jigPrediction === 'bullish' ? "text-green-600" : "text-red-600"
          )}>
            {mainAsset} {jigPrediction === 'bullish' ? '📈 상승' : '📉 하락'}
          </span>
        </div>
        
        {/* 투표 버튼 */}
        {isPending && !myVote && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-12 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-400"
              onClick={() => handleVote('bullish')}
              disabled={loading}
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              상승
            </Button>
            <Button
              variant="outline"
              className="h-12 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
              onClick={() => handleVote('bearish')}
              disabled={loading}
            >
              <TrendingDown className="w-5 h-5 mr-2" />
              하락
            </Button>
          </div>
        )}
        
        {/* 투표 결과 */}
        {showStats && (
          <div className="space-y-2">
            {/* 내 투표 */}
            {myVote && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">내 예측:</span>
                <span className={cn(
                  "font-medium flex items-center gap-1",
                  myVote === 'bullish' ? "text-green-600" : "text-red-600"
                )}>
                  {myVote === 'bullish' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {myVote === 'bullish' ? '상승' : '하락'}
                  {isResolved && (
                    isMyVoteCorrect 
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 ml-1" />
                      : <XCircle className="w-4 h-4 text-red-500 ml-1" />
                  )}
                </span>
              </div>
            )}
            
            {/* 투표 현황 바 */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {stats.total}명 참여
                </span>
                <span>
                  상승 {stats.total > 0 ? Math.round(stats.bullish / stats.total * 100) : 0}% : 
                  하락 {stats.total > 0 ? Math.round(stats.bearish / stats.total * 100) : 0}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                <div 
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.bullish / stats.total) * 100 : 50}%` }}
                />
                <div 
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.bearish / stats.total) * 100 : 50}%` }}
                />
              </div>
            </div>
            
            {/* 결과 */}
            {isResolved && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">실제 결과:</span>
                  <span className={cn(
                    "font-bold",
                    prediction.actual_direction === 'up' ? "text-green-600" : "text-red-600"
                  )}>
                    {prediction.actual_direction === 'up' ? '📈' : '📉'} 
                    {prediction.price_change !== null && (
                      <span className="ml-1">
                        {prediction.price_change > 0 ? '+' : ''}{prediction.price_change.toFixed(2)}%
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
