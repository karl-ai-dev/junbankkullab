'use client'

import * as React from "react"
import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Check, ExternalLink, Play, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface VoteCardProps extends React.HTMLAttributes<HTMLDivElement> {
  videoId: string
  title: string
  thumbnail?: string
  publishedAt: string
  asset?: string
  predictedDirection?: "bullish" | "bearish" | "neutral"
  expiresAt?: string
  index?: number // for stagger animation
}

// 로컬스토리지 키
const STORAGE_KEY = "jbk_votes"

interface StoredVote {
  vote: "up" | "down"
  timestamp: number
}

function getStoredVotes(): Record<string, StoredVote> {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function setStoredVote(key: string, vote: "up" | "down") {
  if (typeof window === "undefined") return
  try {
    const votes = getStoredVotes()
    votes[key] = { vote, timestamp: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votes))
  } catch {
    // ignore
  }
}

export function VoteCard({
  videoId,
  title,
  thumbnail,
  publishedAt,
  asset,
  predictedDirection,
  expiresAt,
  index = 0,
  className,
  ...props
}: VoteCardProps) {
  const voteKey = `${videoId}_${asset}`
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [upVotes, setUpVotes] = useState(Math.floor(Math.random() * 30) + 20)
  const [downVotes, setDownVotes] = useState(Math.floor(Math.random() * 30) + 20)

  // 로컬스토리지에서 기존 투표 확인
  useEffect(() => {
    const stored = getStoredVotes()
    if (stored[voteKey]) {
      setUserVote(stored[voteKey].vote)
      setHasVoted(true)
    }
  }, [voteKey])

  const handleVote = (direction: "up" | "down") => {
    if (hasVoted) return

    setIsAnimating(true)
    setShowConfetti(true)
    setUserVote(direction)
    setHasVoted(true)
    setStoredVote(voteKey, direction)

    // 투표 수 업데이트 (fake)
    if (direction === "up") {
      setUpVotes(prev => prev + 1)
    } else {
      setDownVotes(prev => prev + 1)
    }

    // 애니메이션 종료
    setTimeout(() => {
      setIsAnimating(false)
      setShowConfetti(false)
    }, 1000)
  }

  const totalVotes = upVotes + downVotes
  const upPercent = Math.round((upVotes / totalVotes) * 100)
  const downPercent = 100 - upPercent

  // 시간 계산
  const publishedDate = new Date(publishedAt)
  const now = new Date()
  const hoursAgo = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60))
  const timeLabel = hoursAgo < 1 ? "방금 전" : hoursAgo < 24 ? `${hoursAgo}시간 전` : `${Math.floor(hoursAgo / 24)}일 전`

  // 남은 시간 계산
  const expiresDate = expiresAt ? new Date(expiresAt) : new Date(publishedDate.getTime() + 24 * 60 * 60 * 1000)
  const remainingMs = Math.max(0, expiresDate.getTime() - now.getTime())
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60))
  const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

  const isBullish = predictedDirection === "bullish"
  const thumbnailUrl = thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  
  // Stagger delay
  const staggerDelay = Math.min(index * 100, 500)

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-border overflow-hidden",
        "bg-gradient-to-br from-card via-card to-card/80",
        "transition-all duration-500 ease-out",
        "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10",
        "animate-scale-in fill-backwards",
        isAnimating && "scale-[1.02]",
        className
      )}
      style={{ animationDelay: `${staggerDelay}ms` }}
      {...props}
    >
      {/* 배경 썸네일 (흐리게) */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-full object-cover opacity-15 blur-2xl scale-125 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/95 to-card/80" />
      </div>

      {/* Confetti effect on vote */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <Sparkles
              key={i}
              className={cn(
                "absolute w-4 h-4 animate-ping",
                userVote === "up" ? "text-bullish" : "text-bearish"
              )}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 500}ms`,
                animationDuration: `${500 + Math.random() * 500}ms`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col p-5 sm:p-6">
        {/* 상단: 메타 정보 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="text-xs font-bold text-primary tracking-wide">LIVE</span>
            {asset && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-sm font-bold text-foreground">{asset}</span>
              </>
            )}
            <span className="text-muted-foreground/50">·</span>
            <span className="text-xs text-muted-foreground">{timeLabel}</span>
          </div>
          
          <a
            href={`https://youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors duration-300 hover:scale-110"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* 썸네일 미리보기 */}
        <a
          href={`https://youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="thumbnail-container relative w-full aspect-video rounded-xl overflow-hidden mb-4 group/thumb"
        >
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover/thumb:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-all duration-300">
            <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center transform scale-75 group-hover/thumb:scale-100 transition-transform duration-300 shadow-xl">
              <Play className="w-7 h-7 text-black ml-1" fill="currentColor" />
            </div>
          </div>
        </a>

        {/* 핵심: 전인구 예측 */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-2 tracking-wide">전인구 예측</p>
          <div 
            className={cn(
              "inline-flex items-center gap-3 px-6 py-3 rounded-xl",
              "transition-all duration-500",
              "transform hover:scale-105",
              isBullish 
                ? "bg-bullish/10 border-2 border-bullish/30 hover:border-bullish/50 hover:shadow-lg hover:shadow-bullish/20" 
                : "bg-bearish/10 border-2 border-bearish/30 hover:border-bearish/50 hover:shadow-lg hover:shadow-bearish/20"
            )}
          >
            {isBullish ? (
              <TrendingUp className="w-7 h-7 text-bullish animate-bounce-subtle" />
            ) : (
              <TrendingDown className="w-7 h-7 text-bearish animate-bounce-subtle" />
            )}
            <span 
              className={cn(
                "text-2xl sm:text-3xl font-black tracking-tight",
                isBullish ? "text-bullish" : "text-bearish"
              )}
            >
              {isBullish ? "상승" : "하락"}
            </span>
          </div>
        </div>

        {/* 제목 (작게) */}
        <p className="text-sm text-muted-foreground text-center mb-5 line-clamp-2 px-2">
          {title}
        </p>

        {/* 투표 버튼 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Button
            variant="outline"
            size="lg"
            disabled={hasVoted}
            onClick={() => handleVote("up")}
            className={cn(
              "relative h-16 flex-col gap-1.5 border-2 transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              hasVoted && userVote === "up" && "border-bullish bg-bullish/15 shadow-lg shadow-bullish/20",
              !hasVoted && "hover:border-bullish hover:bg-bullish/10 hover:shadow-md hover:shadow-bullish/10"
            )}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className={cn(
                "w-5 h-5 transition-all duration-300",
                hasVoted && userVote === "up" ? "text-bullish scale-110" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-bold text-base transition-colors duration-300",
                hasVoted && userVote === "up" && "text-bullish"
              )}>
                상승
              </span>
              {hasVoted && userVote === "up" && (
                <Check className="w-4 h-4 text-bullish animate-scale-in" />
              )}
            </div>
            {hasVoted && (
              <span className="text-xs font-medium text-muted-foreground animate-fade-in">
                {upPercent}% ({upVotes}명)
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            size="lg"
            disabled={hasVoted}
            onClick={() => handleVote("down")}
            className={cn(
              "relative h-16 flex-col gap-1.5 border-2 transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              hasVoted && userVote === "down" && "border-bearish bg-bearish/15 shadow-lg shadow-bearish/20",
              !hasVoted && "hover:border-bearish hover:bg-bearish/10 hover:shadow-md hover:shadow-bearish/10"
            )}
          >
            <div className="flex items-center gap-2">
              <TrendingDown className={cn(
                "w-5 h-5 transition-all duration-300",
                hasVoted && userVote === "down" ? "text-bearish scale-110" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-bold text-base transition-colors duration-300",
                hasVoted && userVote === "down" && "text-bearish"
              )}>
                하락
              </span>
              {hasVoted && userVote === "down" && (
                <Check className="w-4 h-4 text-bearish animate-scale-in" />
              )}
            </div>
            {hasVoted && (
              <span className="text-xs font-medium text-muted-foreground animate-fade-in">
                {downPercent}% ({downVotes}명)
              </span>
            )}
          </Button>
        </div>

        {/* 투표 결과 바 */}
        {hasVoted && (
          <div className="space-y-2 animate-fade-up">
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted/50">
              <div
                className="bg-gradient-to-r from-bullish to-bullish/80 transition-all duration-1000 ease-out"
                style={{ width: `${upPercent}%` }}
              />
              <div
                className="bg-gradient-to-r from-bearish/80 to-bearish transition-all duration-1000 ease-out"
                style={{ width: `${downPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span className="text-bullish">상승 {upPercent}%</span>
              <span className="text-bearish">하락 {downPercent}%</span>
            </div>
          </div>
        )}

        {/* 하단 정보 */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30 text-xs text-muted-foreground">
          <span className="font-medium">{totalVotes}명 참여</span>
          {remainingMs > 0 ? (
            <span className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              {remainingHours}시간 {remainingMins}분 남음
            </span>
          ) : (
            <span className="text-primary font-bold animate-pulse">결과 확정</span>
          )}
        </div>
      </div>
    </div>
  )
}
