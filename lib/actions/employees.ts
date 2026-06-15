'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function inviteEmployee(fullName: string, email: string) {
  const supabase = await createClient()

  // Supabase Admin API로 초대 메일 발송
  // SERVICE_ROLE_KEY가 필요하므로, 여기서는 signUp으로 처리 (임시 비밀번호 방식)
  // 실제 운영 시 SUPABASE_SERVICE_ROLE_KEY + adminAuthClient.inviteUserByEmail 사용 권장
  const { error } = await supabase.auth.signUp({
    email,
    password: Math.random().toString(36).slice(-10) + 'A1!', // 임시 비밀번호
    options: {
      data: {
        full_name: fullName,
        role: 'employee',
      },
    },
  })

  if (error) throw new Error(error.message)
  revalidatePath('/employees')
}

export async function updateEmployeeRole(profileId: string, role: 'admin' | 'employee') {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', profileId)
  if (error) throw new Error(error.message)
  revalidatePath('/employees')
}

export async function deactivateEmployee(profileId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', profileId)
  if (error) throw new Error(error.message)
  revalidatePath('/employees')
}

export async function createTeam(name: string, description: string, memberIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { data: team, error } = await supabase
    .from('teams')
    .insert({ name, description, created_by: user.id })
    .select()
    .single()

  if (error || !team) throw new Error(error?.message || '팀 생성 실패')

  if (memberIds.length > 0) {
    await supabase.from('team_members').insert(
      memberIds.map((id) => ({ team_id: team.id, profile_id: id }))
    )
  }

  revalidatePath('/employees')
  return team
}
