'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function inviteEmployee(fullName: string, email: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password: Math.random().toString(36).slice(-10) + 'A1!',
    options: { data: { full_name: fullName, role: 'employee' } },
  })

  if (error) throw new Error(error.message)

  if (data.user) {
    await supabase.from('profiles').update({ is_active: true }).eq('id', data.user.id)
  }

  revalidatePath('/employees')
}

export async function approveEmployee(profileId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', profileId)
  if (error) throw new Error(error.message)
  revalidateTag('profile')
  revalidatePath('/employees')
}

export async function rejectEmployee(profileId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').delete().eq('id', profileId)
  if (error) throw new Error(error.message)
  revalidatePath('/employees')
}

export async function deleteEmployee(profileId: string) {
  const supabase = await createClient()
  // profiles 삭제 → task_assignments cascade 삭제됨
  const { error } = await supabase.from('profiles').delete().eq('id', profileId)
  if (error) throw new Error(error.message)
  revalidateTag('profile')
  revalidatePath('/employees')
}

export async function resetEmployeePassword(email: string) {
  const supabase = await createClient()
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
  })
  if (error) throw new Error(error.message)
}

export async function updateEmployeeRole(profileId: string, role: 'team_lead' | 'employee') {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId)
  if (error) throw new Error(error.message)
  revalidateTag('profile')
  revalidatePath('/employees')
}

export async function deactivateEmployee(profileId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', profileId)
  if (error) throw new Error(error.message)
  revalidateTag('profile')
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
