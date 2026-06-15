import { cache } from 'react'
import { createClient } from './server'

// React cache()로 같은 요청 내에서 중복 호출 방지 (실제 DB 왕복은 1회)
export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getProfile = cache(async () => {
  const user = await getAuthUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data
})
