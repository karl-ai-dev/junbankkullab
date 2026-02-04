'use client'

import * as React from 'react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface DataPoint {
  date: string
  value: number
}

interface HoneyIndexChartProps {
  currentValue: number
  data?: DataPoint[]
  totalPredictions: number
  className?: string
}

// Generate mock historical data
// TODO: Replace with real time series data from API
function generateMockData(currentValue: number): DataPoint[] {
  const data: DataPoint[] = []
  const now = new Date()
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    
    // Generate value with some variance around the current value
    const variance = (Math.random() - 0.5) * 20
    const value = Math.max(0, Math.min(100, currentValue + variance - (i * 0.3)))
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 10) / 10
    })
  }
  
  // Ensure last point is the current value
  data[data.length - 1].value = currentValue
  
  return data
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  
  const value = payload[0].value
  const date = new Date(label)
  
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">
        {date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
      </p>
      <p className="text-sm font-bold text-honey">
        {value.toFixed(1)}%
      </p>
    </div>
  )
}

export function HoneyIndexChart({ 
  currentValue, 
  data, 
  totalPredictions,
  className,
}: HoneyIndexChartProps) {
  const chartData = data || generateMockData(currentValue)
  
  // Calculate stats
  const firstValue = chartData[0]?.value || currentValue
  const change = currentValue - firstValue
  const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0
  
  // Determine trend
  const trend = change > 1 ? 'up' : change < -1 ? 'down' : 'neutral'
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  
  // Color based on value (not change)
  const getValueColor = () => {
    if (currentValue >= 60) return 'bullish'
    if (currentValue <= 40) return 'bearish'
    return 'pending'
  }
  const valueColor = getValueColor()
  
  // Chart colors (hex for SVG compatibility)
  const CHART_COLORS = {
    honey: '#fcd535',
    bullish: '#0ecb81',
    bearish: '#f6465d',
    grid: '#1f242b',
    text: '#5e6673',
  }
  
  const chartColor = CHART_COLORS.honey

  return (
    <div className={cn(
      "flex flex-col rounded-2xl border border-border bg-card overflow-hidden h-full",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍯</span>
          <span className="text-sm font-medium text-muted-foreground">
            전반꿀 지수
          </span>
        </div>
        <Badge variant={valueColor === 'bullish' ? 'bullish' : valueColor === 'bearish' ? 'bearish' : 'pending'}>
          {valueColor === 'bullish' ? '역지표 강세' : valueColor === 'bearish' ? '역지표 약세' : '중립'}
        </Badge>
      </div>

      {/* Stats Row */}
      <div className="flex items-end justify-between px-5 py-4 border-b border-border">
        {/* Current Value */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-5xl font-bold tabular-nums tracking-tight",
              valueColor === 'bullish' && "text-bullish",
              valueColor === 'bearish' && "text-bearish",
              valueColor === 'pending' && "text-honey",
            )}>
              {currentValue.toFixed(1)}
            </span>
            <span className={cn(
              "text-xl font-medium",
              valueColor === 'bullish' && "text-bullish/70",
              valueColor === 'bearish' && "text-bearish/70",
              valueColor === 'pending' && "text-honey/70",
            )}>%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalPredictions}개 예측 기준
          </p>
        </div>
        
        {/* 30-day Change */}
        <div className="text-right">
          <div className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold",
            change >= 0 
              ? "bg-bullish/15 text-bullish" 
              : "bg-bearish/15 text-bearish"
          )}>
            <TrendIcon className="w-4 h-4" />
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%p
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">30일 변화</p>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 px-2 py-4 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData} 
            margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="honeyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.4}/>
                <stop offset="100%" stopColor={chartColor} stopOpacity={0.02}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={CHART_COLORS.grid}
              vertical={false}
            />
            
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: CHART_COLORS.text }}
              tickFormatter={(value) => {
                const date = new Date(value)
                return `${date.getMonth() + 1}/${date.getDate()}`
              }}
              interval="preserveStartEnd"
              dy={10}
            />
            
            <YAxis 
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: CHART_COLORS.text }}
              tickFormatter={(value) => `${value}`}
              width={30}
              tickCount={5}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* 50% Reference Line - Random baseline */}
            <ReferenceLine 
              y={50} 
              stroke={CHART_COLORS.text}
              strokeDasharray="6 4" 
              strokeOpacity={0.5}
            />
            
            <Area
              type="monotone"
              dataKey="value"
              stroke={chartColor}
              strokeWidth={2.5}
              fill="url(#honeyGradient)"
              dot={false}
              activeDot={{
                r: 6,
                fill: chartColor,
                stroke: '#0b0e11',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-px bg-muted-foreground opacity-50" style={{ borderTop: '2px dashed' }} />
            <span>50% 기준선</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          높을수록 역지표 정확도 ↑
        </span>
      </div>
    </div>
  )
}
