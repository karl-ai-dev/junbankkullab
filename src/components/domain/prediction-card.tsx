'use client'

import * as React from "react"
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, ExternalLink, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type PredictionStatus = "pending" | "correct" | "incorrect"
type PredictionDirection = "bullish" | "bearish" | "neutral"

interface PredictionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  thumbnail?: string
  videoId?: string
  publishedAt: string
  asset?: string
  predictedDirection: PredictionDirection
  actualDirection?: PredictionDirection
  status: PredictionStatus
  priceChange?: number // percentage
  videoUrl?: string
  index?: number // for stagger animation
}

export function PredictionCard({
  title,
  thumbnail,
  videoId,
  publishedAt,
  asset,
  predictedDirection,
  actualDirection,
  status,
  priceChange,
  videoUrl,
  index = 0,
  className,
  ...props
}: PredictionCardProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      label: "대기중",
      variant: "pending" as const,
      bgClass: "bg-pending/5",
      borderClass: "border-pending/20",
    },
    correct: {
      icon: CheckCircle,
      label: "적중",
      variant: "bullish" as const,
      bgClass: "bg-bullish/5",
      borderClass: "border-bullish/20",
    },
    incorrect: {
      icon: XCircle,
      label: "빗나감",
      variant: "bearish" as const,
      bgClass: "bg-bearish/5",
      borderClass: "border-bearish/20",
    },
  }
  
  const directionConfig = {
    bullish: {
      icon: TrendingUp,
      label: "상승",
      color: "text-bullish",
    },
    bearish: {
      icon: TrendingDown,
      label: "하락",
      color: "text-bearish",
    },
    neutral: {
      icon: null,
      label: "중립",
      color: "text-muted-foreground",
    },
  }
  
  const config = statusConfig[status]
  const StatusIcon = config.icon
  const PredictionIcon = directionConfig[predictedDirection].icon
  
  // Generate thumbnail URL if not provided
  const thumbnailUrl = thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null)
  const youtubeUrl = videoUrl || (videoId ? `https://youtube.com/watch?v=${videoId}` : null)
  
  // Stagger delay calculation (max 800ms)
  const staggerDelay = Math.min(index * 50, 800)
  
  return (
    <div
      className={cn(
        "group relative flex gap-4 rounded-xl border p-4",
        "bg-card/50 backdrop-blur-sm",
        "transition-all duration-300 ease-out",
        "hover:bg-card hover:border-primary/30",
        "hover:shadow-lg hover:shadow-primary/5",
        "hover:-translate-y-1",
        "animate-fade-up fill-backwards",
        config.bgClass,
        config.borderClass,
        className
      )}
      style={{ animationDelay: `${staggerDelay}ms` }}
      {...props}
    >
      {/* Thumbnail */}
      {thumbnailUrl && (
        <a
          href={youtubeUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="thumbnail-container relative w-32 sm:w-40 h-20 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted group/thumb"
        >
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110"
            loading="lazy"
          />
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-300">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center transform scale-75 group-hover/thumb:scale-100 transition-transform duration-300">
              <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
            </div>
          </div>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-300" />
        </a>
      )}
      
      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <a
              href={youtubeUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <h4 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-300">
                {title}
              </h4>
            </a>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              {asset && (
                <>
                  <span className="font-semibold text-foreground bg-secondary/50 px-2 py-0.5 rounded-md">
                    {asset}
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{new Date(publishedAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}</span>
            </div>
          </div>
          
          {/* Status badge */}
          <Badge 
            variant={config.variant} 
            className={cn(
              "flex-shrink-0 gap-1 transition-all duration-300",
              "group-hover:scale-105"
            )}
          >
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </Badge>
        </div>
        
        {/* Bottom row */}
        <div className="flex items-center justify-between mt-3">
          {/* Prediction */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">예측:</span>
            <span className={cn(
              "flex items-center gap-1 font-semibold transition-all duration-300",
              directionConfig[predictedDirection].color
            )}>
              {PredictionIcon && (
                <PredictionIcon className="w-4 h-4 group-hover:animate-bounce-subtle" />
              )}
              {directionConfig[predictedDirection].label}
            </span>
            
            {/* Actual result */}
            {actualDirection && status !== "pending" && (
              <>
                <span className="text-muted-foreground">→</span>
                <span className={cn(
                  "flex items-center gap-1 font-semibold",
                  directionConfig[actualDirection].color
                )}>
                  {directionConfig[actualDirection].icon && 
                    React.createElement(directionConfig[actualDirection].icon, { className: "w-4 h-4" })
                  }
                  {directionConfig[actualDirection].label}
                </span>
              </>
            )}
          </div>
          
          {/* Price change */}
          {priceChange !== undefined && status !== "pending" && (
            <span className={cn(
              "text-sm font-bold tabular-nums px-2 py-0.5 rounded-md",
              priceChange >= 0 
                ? "text-bullish bg-bullish/10" 
                : "text-bearish bg-bearish/10"
            )}>
              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
            </span>
          )}
          
          {/* External link for mobile */}
          {youtubeUrl && (
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={cn(
          "absolute inset-0 rounded-xl",
          status === 'correct' && "shadow-[inset_0_0_20px_rgba(14,203,129,0.1)]",
          status === 'incorrect' && "shadow-[inset_0_0_20px_rgba(246,70,93,0.1)]",
          status === 'pending' && "shadow-[inset_0_0_20px_rgba(252,213,53,0.1)]"
        )} />
      </div>
    </div>
  )
}
