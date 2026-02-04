/**
 * Data Collection Script
 * 
 * 1. Fetch videos from last 30 days from 전인구경제연구소 YouTube channel
 * 2. Analyze titles for sentiment and asset detection
 * 3. Fetch market data (Binance for crypto, yfinance for stocks/indices)
 * 4. Calculate honey index (inverse correlation)
 * 5. Save to JSON
 */

import { config } from 'dotenv'
import { execSync } from 'child_process'
import * as path from 'path'

config({ path: '.env.local' })

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const CHANNEL_ID = 'UCznImSIaxZR7fdLCICLdgaQ' // 전인구경제연구소

// Asset patterns
const ASSET_PATTERNS: Record<string, { patterns: RegExp[], symbol: string, type: 'crypto' | 'stock' | 'index' }> = {
  Bitcoin: { patterns: [/비트코인/i, /btc/i, /코인/i, /암호화폐/i, /가상화폐/i, /크립토/i], symbol: 'BTCUSDT', type: 'crypto' },
  Ethereum: { patterns: [/이더리움/i, /eth/i, /이더/i], symbol: 'ETHUSDT', type: 'crypto' },
  KOSPI: { patterns: [/코스피/i, /kospi/i, /한국\s*(주식|증시)/i], symbol: 'KOSPI', type: 'index' },
  NASDAQ: { patterns: [/나스닥/i, /nasdaq/i, /미국\s*(주식|증시)/i, /미장/i], symbol: 'NASDAQ', type: 'index' },
  Tesla: { patterns: [/테슬라/i, /tesla/i, /tsla/i], symbol: 'Tesla', type: 'stock' },
  Samsung: { patterns: [/삼성전자/i, /삼전/i], symbol: 'Samsung', type: 'stock' },
  Nvidia: { patterns: [/엔비디아/i, /nvidia/i, /nvda/i], symbol: 'Nvidia', type: 'stock' },
}

const BULLISH_PATTERNS = [
  /상승/i, /오른다/i, /올라/i, /급등/i, /폭등/i, /사야/i, /매수/i, 
  /기회/i, /저점/i, /반등/i, /회복/i, /돌파/i, /신고가/i, /호재/i
]

const BEARISH_PATTERNS = [
  /하락/i, /떨어/i, /내려/i, /급락/i, /폭락/i, /팔아/i, /매도/i,
  /위험/i, /고점/i, /조정/i, /붕괴/i, /위기/i, /곤두박질/i, /악재/i,
  /버블/i, /끝/i, /빠진다/i, /조심/i, /무너/i, /반토막/i, /침체/i
]

interface Video {
  id: string
  title: string
  thumbnail: string
  publishedAt: string
}

interface AnalyzedVideo extends Video {
  assets: string[]
  sentiment: 'bullish' | 'bearish' | 'neutral'
  bullishScore: number
  bearishScore: number
}

interface Prediction extends AnalyzedVideo {
  asset: string
  priceAtPublish?: number
  priceAfter24h?: number
  priceChange?: number
  actualDirection?: 'up' | 'down'
  isHoney?: boolean
}

// Get channel's uploads playlist ID
async function getUploadsPlaylistId(): Promise<string> {
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not set')

  const params = new URLSearchParams({
    part: 'contentDetails',
    id: CHANNEL_ID,
    key: YOUTUBE_API_KEY,
  })

  const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`)
  if (!response.ok) {
    throw new Error(`YouTube API error: ${await response.text()}`)
  }

  const data = await response.json()
  return data.items[0].contentDetails.relatedPlaylists.uploads
}

// Fetch videos from last N days
async function fetchRecentVideos(days = 30): Promise<Video[]> {
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not set')

  const playlistId = await getUploadsPlaylistId()
  console.log(`Uploads playlist ID: ${playlistId}`)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  console.log(`Fetching videos from last ${days} days (since ${cutoffDate.toISOString().split('T')[0]})`)

  const videos: Video[] = []
  let pageToken = ''

  while (true) {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: '50',
      key: YOUTUBE_API_KEY,
    })
    
    if (pageToken) params.set('pageToken', pageToken)

    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`)
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${await response.text()}`)
    }

    const data = await response.json()
    
    let foundOlderVideo = false
    
    for (const item of data.items) {
      if (item.snippet.resourceId.kind !== 'youtube#video') continue
      
      const publishedAt = new Date(item.snippet.publishedAt)
      
      if (publishedAt < cutoffDate) {
        foundOlderVideo = true
        break
      }
      
      videos.push({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
        publishedAt: item.snippet.publishedAt,
      })
    }

    console.log(`Fetched ${videos.length} videos from last ${days} days...`)

    if (foundOlderVideo || !data.nextPageToken) break
    pageToken = data.nextPageToken
  }

  return videos
}

// Analyze video title
function analyzeTitle(title: string): { assets: string[], sentiment: 'bullish' | 'bearish' | 'neutral', bullishScore: number, bearishScore: number } {
  const assets: string[] = []
  
  for (const [asset, config] of Object.entries(ASSET_PATTERNS)) {
    if (config.patterns.some(p => p.test(title))) {
      assets.push(asset)
    }
  }

  let bullishScore = 0
  let bearishScore = 0

  for (const p of BULLISH_PATTERNS) {
    if (p.test(title)) bullishScore++
  }
  
  for (const p of BEARISH_PATTERNS) {
    if (p.test(title)) bearishScore++
  }

  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (bullishScore > bearishScore) sentiment = 'bullish'
  else if (bearishScore > bullishScore) sentiment = 'bearish'

  return { assets, sentiment, bullishScore, bearishScore }
}

// Fetch crypto price at timestamp from Binance
async function getCryptoPriceAt(symbol: string, timestamp: number): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      symbol,
      interval: '1h',
      startTime: String(timestamp),
      limit: '1',
    })

    const response = await fetch(`https://api.binance.com/api/v3/klines?${params}`)
    if (!response.ok) return null

    const data = await response.json()
    if (!data.length) return null

    return parseFloat(data[0][4])
  } catch {
    return null
  }
}

// Fetch stock/index price using Python yfinance
function getStockPrice(symbol: string, timestampMs: number, hoursAfter = 24): { priceAt: number, priceAfter: number, change: number, direction: 'up' | 'down' } | null {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'market_data.py')
    const pythonPath = path.join(process.cwd(), 'venv', 'bin', 'python')
    
    const result = execSync(`${pythonPath} ${scriptPath} ${symbol} ${timestampMs} ${hoursAfter}`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    const data = JSON.parse(result.trim())
    
    if (data.error) return null
    
    return {
      priceAt: data.priceAt,
      priceAfter: data.priceAfter,
      change: data.change,
      direction: data.direction
    }
  } catch (e) {
    return null
  }
}

// Main collection function
async function collect() {
  console.log('Starting data collection...')
  
  // 1. Fetch videos
  console.log('Fetching videos from YouTube...')
  const videos = await fetchRecentVideos(30)
  console.log(`Total fetched: ${videos.length} videos from last 30 days`)

  // 2. Analyze titles
  console.log('Analyzing titles...')
  const analyzedVideos: AnalyzedVideo[] = videos.map(v => ({
    ...v,
    ...analyzeTitle(v.title),
  }))

  // 3. Filter for videos with detected assets and clear sentiment
  const predictions: Prediction[] = []
  
  for (const video of analyzedVideos) {
    if (video.assets.length === 0 || video.sentiment === 'neutral') continue
    
    for (const asset of video.assets) {
      predictions.push({
        ...video,
        asset,
      })
    }
  }

  console.log(`Found ${predictions.length} predictions with clear sentiment`)

  // 4. Fetch market data
  console.log('Fetching market data...')
  const now = Date.now()
  let cryptoProcessed = 0
  let stockProcessed = 0
  
  for (const pred of predictions) {
    const assetConfig = ASSET_PATTERNS[pred.asset]
    if (!assetConfig) continue

    const publishTime = new Date(pred.publishedAt).getTime()
    const after24h = publishTime + 24 * 60 * 60 * 1000

    // Only fetch if 24h has passed
    if (after24h > now) continue

    if (assetConfig.type === 'crypto') {
      // Use Binance API for crypto
      const priceAtPublish = await getCryptoPriceAt(assetConfig.symbol, publishTime)
      const priceAfter24h = await getCryptoPriceAt(assetConfig.symbol, after24h)

      if (priceAtPublish && priceAfter24h) {
        pred.priceAtPublish = priceAtPublish
        pred.priceAfter24h = priceAfter24h
        pred.priceChange = ((priceAfter24h - priceAtPublish) / priceAtPublish) * 100
        pred.actualDirection = pred.priceChange >= 0 ? 'up' : 'down'
        
        pred.isHoney = (
          (pred.sentiment === 'bullish' && pred.actualDirection === 'down') ||
          (pred.sentiment === 'bearish' && pred.actualDirection === 'up')
        )
        
        cryptoProcessed++
      }
      
      await new Promise(r => setTimeout(r, 50))
      
    } else {
      // Use yfinance for stocks/indices
      const result = getStockPrice(assetConfig.symbol, publishTime, 24)
      
      if (result) {
        pred.priceAtPublish = result.priceAt
        pred.priceAfter24h = result.priceAfter
        pred.priceChange = result.change
        pred.actualDirection = result.direction
        
        pred.isHoney = (
          (pred.sentiment === 'bullish' && pred.actualDirection === 'down') ||
          (pred.sentiment === 'bearish' && pred.actualDirection === 'up')
        )
        
        stockProcessed++
        
        if (stockProcessed % 5 === 0) {
          console.log(`Processed ${stockProcessed} stock/index predictions...`)
        }
      }
    }
  }

  console.log(`Processed: ${cryptoProcessed} crypto, ${stockProcessed} stock/index`)

  // 5. Calculate stats
  const completePredictions = predictions.filter(p => p.isHoney !== undefined)
  const honeyCount = completePredictions.filter(p => p.isHoney).length
  const honeyIndex = completePredictions.length > 0 
    ? (honeyCount / completePredictions.length) * 100 
    : 0

  // Per-asset stats
  const assetStats: Record<string, { total: number, honey: number }> = {}
  for (const pred of completePredictions) {
    if (!assetStats[pred.asset]) assetStats[pred.asset] = { total: 0, honey: 0 }
    assetStats[pred.asset].total++
    if (pred.isHoney) assetStats[pred.asset].honey++
  }

  console.log(`\n=== Results ===`)
  console.log(`Total videos: ${videos.length}`)
  console.log(`Total predictions: ${predictions.length}`)
  console.log(`Completed (with market data): ${completePredictions.length}`)
  console.log(`Honey Index: ${honeyIndex.toFixed(1)}%`)
  console.log(`\nPer-asset stats:`)
  for (const [asset, stats] of Object.entries(assetStats)) {
    const pct = stats.total > 0 ? (stats.honey / stats.total) * 100 : 0
    console.log(`  ${asset}: ${pct.toFixed(1)}% (${stats.honey}/${stats.total})`)
  }

  // 6. Save to file
  const fs = await import('fs/promises')
  await fs.mkdir('./data', { recursive: true })
  
  const output = {
    collectedAt: new Date().toISOString(),
    stats: {
      totalVideos: videos.length,
      totalPredictions: predictions.length,
      completePredictions: completePredictions.length,
      honeyIndex,
      honeyCount,
      assetStats: Object.entries(assetStats).map(([asset, s]) => ({
        asset,
        honeyIndex: s.total > 0 ? (s.honey / s.total) * 100 : 0,
        predictions: s.total,
      })),
    },
    predictions: predictions.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    ),
  }

  await fs.writeFile('./data/predictions.json', JSON.stringify(output, null, 2))
  console.log('\nSaved to ./data/predictions.json')
}

collect().catch(console.error)
