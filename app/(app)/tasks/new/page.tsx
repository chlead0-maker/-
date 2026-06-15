import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TaskForm from '@/components/tasks/TaskForm'
import type { Profile, Team } from '@/lib/types'

export default async function NewTaskPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // 관리자: 직원 목록 + 팀 목록 필요. 직원: 빈 배열
  const [{ data: employees }, { data: teams }] = await Promise.all([
    isAdmin
      ? supabase.from('profiles').select('*').eq('role', 'employee').eq('is_active', true).order('full_name')
      : { data: [] },
    isAdmin
      ? supabase.from('teams').select('*').order('name')
      : { data: [] },
  ])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {isAdmin ? '업무 생성' : '내 업무 추가'}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {isAdmin
          ? '직원에게 업무를 할당합니다'
          : '본인이 처리할 업무를 추가합니다'}
      </p>
      <TaskForm
        employees={(employees || []) as Profile[]}
        teams={(teams || []) as Team[]}
        isAdmin={isAdmin}
      />
    </div>
  )
}
