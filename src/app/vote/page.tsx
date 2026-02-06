/**
 * 투표 페이지
 * 
 * 기능:
 * - 진행 중인 투표 목록
 * - 완료된 투표 결과
 */

import { createClient } from '@supabase/supabase-js'
import { SupabaseVoteCard } from '@/components/domain/supabase-vote-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getPredictions() {
  const { data: pending } = await supabase
    .from('predictions')
    .select('*')
    .eq('status', 'pending')
    .order('published_at', { ascending: false })
    .limit(10)
  
  const { data: resolved } = await supabase
    .from('predictions')
    .select('*')
    .eq('status', 'resolved')
    .order('published_at', { ascending: false })
    .limit(20)
  
  return {
    pending: pending ?? [],
    resolved: resolved ?? [],
  }
}

export const revalidate = 60 // 1분마다 갱신

export default async function VotePage() {
  const { pending, resolved } = await getPredictions()
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🗳️ 전반꿀 투표</h1>
        <p className="text-muted-foreground">
          전인구 전망 vs 당신의 예측
        </p>
      </div>
      
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            진행 중
            {pending.length > 0 && (
              <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">완료됨</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6 space-y-4">
          {pending.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">현재 진행 중인 투표가 없습니다</p>
              <p className="text-sm mt-2">새 영상이 올라오면 투표가 시작됩니다</p>
            </div>
          ) : (
            pending.map((prediction) => (
              <SupabaseVoteCard key={prediction.id} prediction={prediction} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="resolved" className="mt-6 space-y-4">
          {resolved.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>아직 완료된 투표가 없습니다</p>
            </div>
          ) : (
            resolved.map((prediction) => (
              <SupabaseVoteCard key={prediction.id} prediction={prediction} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
