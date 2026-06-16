import { redirect } from 'next/navigation'
import { getAuthUser, getProfile } from '@/lib/supabase/cached'
import { createClient } from '@/lib/supabase/server'
import TaskForm from '@/components/tasks/TaskForm'
import type { Profile, Team } from '@/lib/types'

export default async function NewTaskPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user || !profile) redirect('/login')

  const canAssign = profile.role === 'admin' || profile.role === 'team_lead'

  const supabase = await createClient()
  const [{ data: employees }, { data: teams }] = await Promise.all([
    canAssign
      ? supabase.from('profiles').select('*').in('role', ['employee', 'team_lead']).eq('is_active', true).order('full_name')
      : { data: [] },
    canAssign
      ? supabase.from('teams').select('*').order('name')
      : { data: [] },
  ])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {canAssign ? '업무 생성' : '내 업무 추가'}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {canAssign
          ? '직원에게 업무를 할당합니다'
          : '본인이 처리할 업무를 추가합니다'}
      </p>
      <TaskForm
        employees={(employees || []) as Profile[]}
        teams={(teams || []) as Team[]}
        isAdmin={canAssign}
      />
    </div>
  )
}
