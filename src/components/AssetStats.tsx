'use client'

interface AssetStat {
  asset: string
  honeyIndex: number
  predictions: number
}

interface AssetStatsProps {
  assets: AssetStat[]
}

export function AssetStats({ assets }: AssetStatsProps) {
  if (!assets || assets.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center">
        <p className="text-[var(--text-muted)] text-sm">분석된 종목이 없습니다</p>
      </div>
    )
  }

  const getStyles = (pct: number) => {
    if (pct >= 70) return { 
      color: 'var(--honey)', 
      bg: 'var(--honey-bg)',
      label: '강한 역상관'
    }
    if (pct >= 55) return { 
      color: 'var(--positive)', 
      bg: 'var(--positive-bg)',
      label: '약한 역상관'
    }
    return { 
      color: 'var(--text-muted)', 
      bg: 'var(--surface-elevated)',
      label: '무의미'
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {assets.map((stat) => {
        const styles = getStyles(stat.honeyIndex)
        return (
          <div 
            key={stat.asset}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--text-muted)] transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--text-primary)]">
                {stat.asset}
              </h3>
              <span className="text-xs text-[var(--text-muted)]">
                {stat.predictions}건
              </span>
            </div>
            
            {/* Badge-style percentage */}
            <div className="flex items-center gap-3 mb-3">
              <span 
                className="text-3xl font-bold tabular-nums"
                style={{ color: styles.color }}
              >
                {stat.honeyIndex.toFixed(1)}%
              </span>
              <span 
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: styles.bg,
                  color: styles.color
                }}
              >
                {styles.label}
              </span>
            </div>
            
            {/* Mini progress bar */}
            <div className="h-2 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${stat.honeyIndex}%`,
                  backgroundColor: styles.color
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
