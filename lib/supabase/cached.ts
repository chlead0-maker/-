import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from './server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  // getSession()은 로컬 JWT 디코딩 (~5ms) — getUser()의 원격 HTTP 검증 (~100ms) 대신 사용
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
})

// service role key가 있으면 DB 쿼리 결과를 5분간 캐싱 (없으면 직접 조회 폴백)
const getCachedProfile = unstable_cache(
  async (userId: string) => {
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return data
  },
  ['profile'],
  { revalidate: 300, tags: ['profile'] }
)

export const getProfile = cache(async () => {
  const user = await getAuthUser()
  if (!user) return null

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return getCachedProfile(user.id)
  }

  // 폴백: service role key 없을 때 직접 조회
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
})
