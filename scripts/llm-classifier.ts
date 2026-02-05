#!/usr/bin/env npx tsx
/**
 * LLM 기반 영상 분류기
 * 
 * 역할:
 * - 영상 제목에서 종목/섹터 추출
 * - 톤(긍정/부정) 분석
 * - 판단 근거 생성
 * 
 * 사용처:
 * - scripts/analyze-v3.ts 에서 호출
 * - GitHub Actions 자동 수집 시 실행
 * 
 * API:
 * - OpenAI GPT-4o-mini
 * - 환경변수: OPENAI_API_KEY (.env.local)
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// .env.local 로드
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 섹터-티커 매핑 테이블
 * 
 * 새 섹터 추가 시 여기에 추가하면 됨
 * LLM이 인식한 섹터명을 티커로 매핑
 */
export const SECTOR_TICKER_MAP: Record<string, { ticker: string; name: string; market: string }> = {
  // 지수
  'KOSPI': { ticker: '^KS11', name: '코스피', market: 'XKRX' },
  'SP500': { ticker: '^GSPC', name: 'S&P500', market: 'NYSE' },
  'NASDAQ': { ticker: '^IXIC', name: '나스닥', market: 'NYSE' },
  
  // 개별 종목 (미국)
  'Nvidia': { ticker: 'NVDA', name: '엔비디아', market: 'NYSE' },
  'Tesla': { ticker: 'TSLA', name: '테슬라', market: 'NYSE' },
  'Google': { ticker: 'GOOGL', name: '구글', market: 'NYSE' },
  'Apple': { ticker: 'AAPL', name: '애플', market: 'NYSE' },
  'Microsoft': { ticker: 'MSFT', name: '마이크로소프트', market: 'NYSE' },
  'Amazon': { ticker: 'AMZN', name: '아마존', market: 'NYSE' },
  'Meta': { ticker: 'META', name: '메타', market: 'NYSE' },
  
  // 개별 종목 (한국)
  'Samsung': { ticker: '005930.KS', name: '삼성전자', market: 'XKRX' },
  'SKHynix': { ticker: '000660.KS', name: 'SK하이닉스', market: 'XKRX' },
  'Hyundai': { ticker: '005380.KS', name: '현대차', market: 'XKRX' },
  'LGEnergy': { ticker: '373220.KS', name: 'LG에너지솔루션', market: 'XKRX' },
  'SamsungBio': { ticker: '207940.KS', name: '삼성바이오로직스', market: 'XKRX' },
  'Celltrion': { ticker: '068270.KS', name: '셀트리온', market: 'XKRX' },
  
  // 섹터 (대표 종목으로 매핑)
  'Shipbuilding': { ticker: '009540.KS', name: '조선주 (HD한국조선해양)', market: 'XKRX' },
  'Defense': { ticker: '012450.KS', name: '방산주 (한화에어로스페이스)', market: 'XKRX' },
  'Battery': { ticker: '373220.KS', name: '2차전지주 (LG에너지솔루션)', market: 'XKRX' },
  'Auto': { ticker: '005380.KS', name: '자동차주 (현대차)', market: 'XKRX' },
  'Bio': { ticker: '207940.KS', name: '바이오주 (삼성바이오로직스)', market: 'XKRX' },
  'Bank': { ticker: '105560.KS', name: '은행주 (KB금융)', market: 'XKRX' },
  'Construction': { ticker: '000720.KS', name: '건설주 (현대건설)', market: 'XKRX' },
  'Steel': { ticker: '005490.KS', name: '철강주 (POSCO홀딩스)', market: 'XKRX' },
  'Chemical': { ticker: '051910.KS', name: '화학주 (LG화학)', market: 'XKRX' },
  'Energy': { ticker: '096770.KS', name: '에너지주 (SK이노베이션)', market: 'XKRX' },
  'Retail': { ticker: '004170.KS', name: '유통주 (신세계)', market: 'XKRX' },
  'Telecom': { ticker: '017670.KS', name: '통신주 (SK텔레콤)', market: 'XKRX' },
  'Nuclear': { ticker: '034020.KS', name: '원전주 (두산에너빌리티)', market: 'XKRX' },
  'Semiconductor': { ticker: '005930.KS', name: '반도체주 (삼성전자)', market: 'XKRX' },
  'Internet': { ticker: '035720.KS', name: '인터넷주 (카카오)', market: 'XKRX' },
  'Game': { ticker: '036570.KS', name: '게임주 (엔씨소프트)', market: 'XKRX' },
  'Entertainment': { ticker: '352820.KS', name: '엔터주 (하이브)', market: 'XKRX' },
  
  // 암호화폐
  'Bitcoin': { ticker: 'BTC-USD', name: '비트코인', market: 'CRYPTO' },
  'Ethereum': { ticker: 'ETH-USD', name: '이더리움', market: 'CRYPTO' },
};

/**
 * LLM 분석 결과 인터페이스
 */
export interface LLMAnalysisResult {
  // 메타 정보
  method: 'llm';
  model: string;
  timestamp: string;
  
  // 추출된 종목/섹터
  detectedAssets: {
    asset: string;           // SECTOR_TICKER_MAP의 키
    ticker: string;          // 실제 티커
    matchedText: string;     // 제목에서 매칭된 텍스트
    confidence: number;      // 0-1 신뢰도
    reasoning: string;       // 추출 근거
  }[];
  
  // 톤 분석
  toneAnalysis: {
    tone: 'positive' | 'negative' | 'neutral';
    keywords: string[];      // 톤 판단에 사용된 키워드
    reasoning: string;       // 톤 판단 근거
  };
  
  // 원본 LLM 응답 (디버깅용)
  rawResponse?: string;
}

/**
 * LLM 프롬프트
 */
const SYSTEM_PROMPT = `당신은 한국 경제/투자 유튜브 영상 제목을 분석하는 전문가입니다.

주어진 영상 제목에서 다음을 추출하세요:

1. **종목/섹터 추출**
   - 언급된 주식, 지수, 암호화폐, 섹터를 모두 추출
   - 섹터 예시: 조선주, 방산주, 2차전지주, 반도체주, 바이오주, 은행주, 건설주, 자동차주, 원전주 등
   - 개별 종목 예시: 삼성전자, SK하이닉스, 테슬라, 엔비디아, 비트코인 등
   - 지수 예시: 코스피, 나스닥, S&P500 등

2. **톤 분석**
   - positive: 상승, 매수, 기회 등 긍정적 전망
   - negative: 하락, 위험, 매도 등 부정적 전망  
   - neutral: 판단 불가

다음 JSON 형식으로 응답하세요:
{
  "assets": [
    {
      "asset": "종목/섹터 식별자 (영문)",
      "matchedText": "제목에서 매칭된 한글 텍스트",
      "confidence": 0.95,
      "reasoning": "추출 근거 (한글)"
    }
  ],
  "tone": {
    "tone": "positive|negative|neutral",
    "keywords": ["판단에 사용된", "키워드들"],
    "reasoning": "톤 판단 근거 (한글)"
  }
}

종목/섹터 식별자는 다음 중 하나를 사용하세요:
- 지수: KOSPI, SP500, NASDAQ
- 미국 종목: Nvidia, Tesla, Google, Apple, Microsoft, Amazon, Meta
- 한국 종목: Samsung, SKHynix, Hyundai, LGEnergy, SamsungBio, Celltrion
- 섹터: Shipbuilding, Defense, Battery, Auto, Bio, Bank, Construction, Steel, Chemical, Energy, Retail, Telecom, Nuclear, Semiconductor, Internet, Game, Entertainment
- 암호화폐: Bitcoin, Ethereum

새로운 종목/섹터가 있으면 가장 가까운 식별자를 사용하거나, 명확한 경우 새 식별자를 제안하세요.`;

/**
 * 영상 제목 분석
 */
export async function analyzeTitle(title: string): Promise<LLMAnalysisResult> {
  const timestamp = new Date().toISOString();
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `영상 제목: "${title}"` }
      ],
      temperature: 0.1, // 일관성을 위해 낮은 temperature
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    
    // 결과 매핑
    const detectedAssets = (parsed.assets || []).map((a: any) => {
      const mapping = SECTOR_TICKER_MAP[a.asset];
      return {
        asset: a.asset,
        ticker: mapping?.ticker || 'UNKNOWN',
        matchedText: a.matchedText || '',
        confidence: a.confidence || 0.5,
        reasoning: a.reasoning || '',
      };
    });
    
    return {
      method: 'llm',
      model: 'gpt-4o-mini',
      timestamp,
      detectedAssets,
      toneAnalysis: {
        tone: parsed.tone?.tone || 'neutral',
        keywords: parsed.tone?.keywords || [],
        reasoning: parsed.tone?.reasoning || '',
      },
      rawResponse: content,
    };
    
  } catch (error) {
    console.error('LLM analysis failed:', error);
    
    // 실패 시 빈 결과 반환
    return {
      method: 'llm',
      model: 'gpt-4o-mini',
      timestamp,
      detectedAssets: [],
      toneAnalysis: {
        tone: 'neutral',
        keywords: [],
        reasoning: 'LLM 분석 실패',
      },
    };
  }
}

/**
 * 캐시 파일 경로
 */
const CACHE_DIR = path.join(__dirname, '../data/cache');
const CACHE_FILE = path.join(CACHE_DIR, 'llm-analysis-cache.json');

/**
 * 캐시 로드
 */
function loadCache(): Record<string, LLMAnalysisResult> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Cache load failed:', e);
  }
  return {};
}

/**
 * 캐시 저장
 */
function saveCache(cache: Record<string, LLMAnalysisResult>): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error('Cache save failed:', e);
  }
}

/**
 * 캐시된 분석 (이미 분석된 제목은 다시 호출 안 함)
 */
export async function analyzeWithCache(videoId: string, title: string): Promise<LLMAnalysisResult> {
  const cache = loadCache();
  const cacheKey = `${videoId}_${title}`;
  
  if (cache[cacheKey]) {
    console.log(`  [캐시 히트] ${videoId}`);
    return cache[cacheKey];
  }
  
  console.log(`  [LLM 분석] ${title.substring(0, 40)}...`);
  const result = await analyzeTitle(title);
  
  cache[cacheKey] = result;
  saveCache(cache);
  
  return result;
}

// CLI 테스트
if (require.main === module) {
  const testTitle = process.argv[2] || '앞으로 조선주가 더 상승할 수 있는 이유(ft.엄경아 연구원)';
  
  console.log(`\n🔍 테스트: "${testTitle}"\n`);
  
  analyzeTitle(testTitle).then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
}
