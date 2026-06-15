export const dynamic = 'force-dynamic'
export const preferredRegion = 'icn1'

import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { getAuthUser, getProfile } from '@/lib/supabase/cached'
import { createClient } from '@/lib/supabase/server'
import CalendarView from '@/components/calendar/CalendarView'
import type { Task, TaskAssignment } from '@/lib/types'

export default async function CalendarPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user || !profile) redirect('/login')

  const isAdmin = profile.role === 'admin'
  const canViewAll = profile.role === 'admin' || profile.role === 'team_lead'

  const supabase = await createClient()
  const today = new Date()
  const from = format(startOfMonth(today), 'yyyy-MM-dd')
  const to = format(endOfMonth(today), 'yyyy-MM-dd')

  let employees: { id: string; full_name: string }[] = []
  let initialItems: Task[] = []
  let initialAssignments: TaskAssignment[] = []

  if (canViewAll) {
    const [{ data: empData }, { data: tasksData }, { data: assignmentsData }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name'),
      supabase
        .from('tasks')
        .select('*, assignments:task_assignments(*, assignee:profiles(*))')
        .gte('due_date', from)
        .lte('due_date', to)
        .order('due_date'),
      supabase.from('task_assignments').select('*').eq('assignee_id', user.id),
    ])
    employees = empData || []
    initialItems = (tasksData || []) as Task[]
    initialAssignments = (assignmentsData || []) as TaskAssignment[]
  } else {
    const [{ data: assignmentsData }, { data: dateTasksData }] = await Promise.all([
      supabase.from('task_assignments').select('*').eq('assignee_id', user.id),
      supabase
        .from('task_assignments')
        .select('task:tasks!inner(*)')
        .eq('assignee_id', user.id)
        .gte('task.due_date', from)
        .lte('task.due_date', to),
    ])
    initialAssignments = (assignmentsData || []) as TaskAssignment[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialItems = ((dateTasksData || []) as any[]).map((d) => {
      const t = Array.isArray(d.task) ? d.task[0] : d.task
      return t as Task
    }).filter(Boolean)
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">캘린더</h1>
        <p className="text-sm text-gray-500 mt-0.5">할일과 일정을 날짜별로 확인하세요</p>
      </div>
      <CalendarView
        canViewAll={canViewAll}
        isAdmin={isAdmin}
        currentUserId={user.id}
        employees={employees}
        initialItems={initialItems}
        initialAssignments={initialAssignments}
      />
    </div>
  )
}
