#!/usr/bin/env npx tsx
/**
 * no_market_data 항목 재처리 스크립트
 * 
 * v2 형태로 남아있던 no_market_data 항목들을:
 * 1. 시장 데이터 재조회 시도
 * 2. 성공하면 analyzed.json으로 이동
 * 3. 실패하면 unanalyzed.json에 유지
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const DATA_DIR = path.join(__dirname, '../data');

// 시장 데이터 가져오기
function getMarketData(asset: string, date: string): {
  closePrice: number;
  previousClose: number;
  priceChange: number;
  direction: 'up' | 'down' | 'flat';
  tradingDate: string;
  ticker: string;
} | null {
  try {
    const projectDir = path.join(__dirname, '..');
    const pythonCmd = `source venv/bin/activate && python3 scripts/market_data.py close ${asset} ${date}`;
    
    const result = execSync(
      `cd "${projectDir}" && ${pythonCmd}`,
      { encoding: 'utf-8', timeout: 30000, shell: '/bin/bash', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    
    const data = JSON.parse(result.trim());
    if (data.error) return null;
    
    const priceChange = data.previousClose 
      ? Math.round(((data.closePrice - data.previousClose) / data.previousClose) * 10000) / 100
      : 0;
    
    return {
      closePrice: data.closePrice,
      previousClose: data.previousClose,
      priceChange,
      direction: data.direction,
      tradingDate: data.tradingDay || data.date,
      ticker: data.symbol,
    };
  } catch (error) {
    return null;
  }
}

// 메인 실행
async function main() {
  console.log('🔄 no_market_data 항목 재처리 시작...\n');

  let totalProcessed = 0;
  let totalRecovered = 0;
  let totalFailed = 0;

  // 모든 월별 폴더 순회
  for (const yearDir of fs.readdirSync(DATA_DIR).sort()) {
    const yearPath = path.join(DATA_DIR, yearDir);
    if (!fs.statSync(yearPath).isDirectory()) continue;
    if (!/^\d{4}$/.test(yearDir)) continue;

    for (const monthDir of fs.readdirSync(yearPath).sort()) {
      const monthPath = path.join(yearPath, monthDir);
      if (!fs.statSync(monthPath).isDirectory()) continue;

      const unanalyzedPath = path.join(monthPath, 'unanalyzed.json');
      const analyzedPath = path.join(monthPath, 'analyzed.json');

      if (!fs.existsSync(unanalyzedPath)) continue;

      const unanalyzed = JSON.parse(fs.readFileSync(unanalyzedPath, 'utf-8'));
      const analyzed = fs.existsSync(analyzedPath) 
        ? JSON.parse(fs.readFileSync(analyzedPath, 'utf-8')) 
        : [];

      // no_market_data 항목만 필터링
      const noMarketDataItems = unanalyzed.filter((item: any) => 
        item.reason === 'no_market_data'
      );

      if (noMarketDataItems.length === 0) continue;

      console.log(`📅 ${yearDir}/${monthDir} - ${noMarketDataItems.length}개 no_market_data 항목`);

      const stillUnanalyzed: any[] = [];
      const newAnalyzed: any[] = [];

      for (const item of noMarketDataItems) {
        totalProcessed++;

        const asset = item.asset;
        const publishDate = item.publishedAt.split('T')[0];
        
        console.log(`  [재조회] ${asset} @ ${publishDate}...`);
        const marketData = getMarketData(asset, publishDate);

        if (!marketData) {
          // 여전히 실패
          stillUnanalyzed.push(item);
          totalFailed++;
          console.log(`    ❌ 실패`);
          continue;
        }

        // 성공! 톤 정보 확인
        const hasTone = item.gpt4oAnalysis?.tone || 
          (item.positiveScore !== undefined && item.negativeScore !== undefined);
        
        if (!hasTone) {
          stillUnanalyzed.push({
            ...item,
            reason: 'no_tone',
          });
          totalFailed++;
          console.log(`    ⚠️ 톤 정보 없음`);
          continue;
        }

        // 톤 결정
        let tone: 'positive' | 'negative' | 'neutral';
        let reasoning: string;
        
        if (item.gpt4oAnalysis?.tone) {
          tone = item.gpt4oAnalysis.tone;
          reasoning = item.gpt4oAnalysis.reasoning;
        } else {
          // v2 positiveScore/negativeScore 사용
          if (item.positiveScore > item.negativeScore) {
            tone = 'positive';
            reasoning = `v2 점수: 긍정 ${item.positiveScore} > 부정 ${item.negativeScore}`;
          } else if (item.negativeScore > item.positiveScore) {
            tone = 'negative';
            reasoning = `v2 점수: 부정 ${item.negativeScore} > 긍정 ${item.positiveScore}`;
          } else {
            stillUnanalyzed.push({
              ...item,
              reason: 'neutral_tone',
            });
            totalFailed++;
            console.log(`    ⚠️ 톤 중립 (${item.positiveScore}:${item.negativeScore})`);
            continue;
          }
        }

        // 꿀지수 계산
        const predictedDirection = tone === 'positive' ? 'bullish' : 'bearish';
        const actualDirection = marketData.direction === 'up' ? 'bullish' : 'bearish';
        const isHoney = predictedDirection !== actualDirection;

        newAnalyzed.push({
          videoId: item.videoId,
          title: item.title,
          publishedAt: item.publishedAt,
          analysis: {
            method: item.gpt4oAnalysis ? 'llm-gpt4o-recovered' : 'v2-score-recovered',
            model: item.gpt4oAnalysis ? 'gpt-4o' : 'v2-regex',
            timestamp: new Date().toISOString(),
            detectedAssets: [{ asset, ticker: marketData.ticker }],
            toneAnalysis: {
              tone,
              reasoning,
              confidence: item.gpt4oAnalysis?.confidence || 0.5,
            },
          },
          marketData: {
            asset,
            ticker: marketData.ticker,
            closePrice: marketData.closePrice,
            previousClose: marketData.previousClose,
            priceChange: marketData.priceChange,
            direction: marketData.direction,
            tradingDate: marketData.tradingDate,
          },
          judgment: {
            predictedDirection,
            actualDirection,
            isHoney,
            reasoning: `${tone === 'positive' ? '긍정' : '부정'} 전망 → 실제 ${marketData.direction === 'up' ? '상승' : '하락'} → ${isHoney ? '역지표 적중!' : '예측대로'}`,
          },
        });
        
        totalRecovered++;
        console.log(`    ✅ 복구 성공 (${isHoney ? '🍯 꿀' : '예측대로'})`);
      }

      // 파일 업데이트
      const remainingUnanalyzed = unanalyzed.filter((item: any) => 
        item.reason !== 'no_market_data'
      );
      
      fs.writeFileSync(
        unanalyzedPath,
        JSON.stringify([...remainingUnanalyzed, ...stillUnanalyzed], null, 2)
      );

      if (newAnalyzed.length > 0) {
        fs.writeFileSync(
          analyzedPath,
          JSON.stringify([...analyzed, ...newAnalyzed], null, 2)
        );
        console.log(`  📊 ${newAnalyzed.length}개 분석에 추가됨\n`);
      }
    }
  }

  console.log('\n==================================================');
  console.log('📊 no_market_data 재처리 결과');
  console.log('==================================================');
  console.log(`처리 시도: ${totalProcessed}개`);
  console.log(`복구 성공: ${totalRecovered}개`);
  console.log(`여전히 실패: ${totalFailed}개`);
  console.log('==================================================\n');
}

main().catch(console.error);
