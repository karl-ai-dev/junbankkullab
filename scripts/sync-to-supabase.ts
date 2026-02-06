#!/usr/bin/env npx tsx
/**
 * JSON 데이터를 Supabase로 동기화
 * 
 * 사용법: npx tsx scripts/sync-to-supabase.ts
 * 
 * 역할:
 * - data/{year}/{month}/analyzed.json → predictions 테이블
 * - 기존 데이터 upsert (video_id 기준)
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// .env.local 로드
const envPath = path.join(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      process.env[match[1].trim()] = match[2].trim()
    }
  }
}

// Service role key 사용 (insert 권한)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const DATA_DIR = path.join(__dirname, '../data')

interface AnalyzedItem {
  videoId: string
  title: string
  publishedAt: string
  analysis: {
    detectedAssets: Array<{
      asset: string
      ticker: string
      confidence: number
    }>
    toneAnalysis: {
      tone: 'positive' | 'negative' | 'neutral'
      reasoning: string
    }
  }
  marketData?: {
    direction: 'up' | 'down' | 'flat'
    priceChange: number
  }
  judgment?: {
    isHoney: boolean
  }
}

async function syncMonth(year: string, month: string) {
  const analyzedPath = path.join(DATA_DIR, year, month, 'analyzed.json')
  
  if (!fs.existsSync(analyzedPath)) {
    return { synced: 0, errors: 0 }
  }
  
  const items: AnalyzedItem[] = JSON.parse(fs.readFileSync(analyzedPath, 'utf-8'))
  let synced = 0
  let errors = 0
  
  for (const item of items) {
    const prediction = {
      video_id: item.videoId,
      title: item.title,
      published_at: item.publishedAt,
      predicted_tone: item.analysis.toneAnalysis.tone,
      detected_assets: item.analysis.detectedAssets,
      analysis_reasoning: item.analysis.toneAnalysis.reasoning,
      status: item.marketData ? 'resolved' : 'pending',
      actual_direction: item.marketData?.direction ?? null,
      price_change: item.marketData?.priceChange ?? null,
      is_honey: item.judgment?.isHoney ?? null,
      resolved_at: item.marketData ? new Date().toISOString() : null,
    }
    
    const { error } = await supabase
      .from('predictions')
      .upsert(prediction, { onConflict: 'video_id' })
    
    if (error) {
      console.error(`  ❌ ${item.title}: ${error.message}`)
      errors++
    } else {
      synced++
    }
  }
  
  return { synced, errors }
}

async function main() {
  console.log('🔄 Supabase 동기화 시작...\n')
  
  let totalSynced = 0
  let totalErrors = 0
  
  // 모든 연/월 디렉토리 탐색
  const years = fs.readdirSync(DATA_DIR).filter(d => /^\d{4}$/.test(d)).sort()
  
  for (const year of years) {
    const yearPath = path.join(DATA_DIR, year)
    const months = fs.readdirSync(yearPath).filter(d => /^\d{2}$/.test(d)).sort()
    
    for (const month of months) {
      const { synced, errors } = await syncMonth(year, month)
      if (synced > 0 || errors > 0) {
        console.log(`📅 ${year}/${month}: ${synced}개 동기화, ${errors}개 에러`)
      }
      totalSynced += synced
      totalErrors += errors
    }
  }
  
  console.log(`\n✅ 완료: ${totalSynced}개 동기화, ${totalErrors}개 에러`)
}

main().catch(console.error)
