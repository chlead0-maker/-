import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { getAuthUser, getProfile } from '@/lib/supabase/cached'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import TasksTabsUI from '@/components/tasks/TasksTabsUI'
import { Plus } from 'lucide-react'
import type { Task, TaskAssignment } from '@/lib/types'
import { cn } from '@/lib/utils'

async function fetchTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  type: string,
  userId: string,
  canViewAll: boolean
) {
  const today = new Date()
  let from: string
  let to: string

  if (type === 'daily') {
    from = to = format(today, 'yyyy-MM-dd')
  } else if (type === 'weekly') {
    from = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    to = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  } else {
    from = format(startOfMonth(today), 'yyyy-MM-dd')
    to = format(endOfMonth(today), 'yyyy-MM-dd')
  }

  if (canViewAll) {
    const { data } = await supabase
      .from('tasks')
      .select('*, assignments:task_assignments(*, assignee:profiles(*))')
      .eq('task_type', type)
      .gte('due_date', from)
      .lte('due_date', to)
      .order('due_date', { ascending: true })
    return (data || []) as Task[]
  }

  const { data } = await supabase
    .from('task_assignments')
    .select('task:tasks!inner(*)')
    .eq('assignee_id', userId)
    .eq('task.task_type', type)
    .gte('task.due_date', from)
    .lte('task.due_date', to)
    .order('task.due_date', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((d: any) => {
    const t = Array.isArray(d.task) ? d.task[0] : d.task
    return t as Task
  }).filter(Boolean)
}

export default async function TasksPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user || !profile) redirect('/login')

  const isAdmin = profile.role === 'admin'
  const canViewAll = profile.role === 'admin' || profile.role === 'team_lead'
  const supabase = await createClient()

  const [dailyTasks, weeklyTasks, monthlyTasks, myAssignmentsData] = await Promise.all([
    fetchTasks(supabase, 'daily', user.id, canViewAll),
    fetchTasks(supabase, 'weekly', user.id, canViewAll),
    fetchTasks(supabase, 'monthly', user.id, canViewAll),
    canViewAll
      ? Promise.resolve({ data: [] })
      : supabase.from('task_assignments').select('*').eq('assignee_id', user.id),
  ])

  const myAssignments = (myAssignmentsData.data || []) as TaskAssignment[]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">업무 목록</h1>
        {isAdmin && (
          <Link
            href="/tasks/new"
            className={cn(buttonVariants(), 'flex items-center gap-2')}
          >
            <Plus className="h-4 w-4" />
            업무 생성
          </Link>
        )}
      </div>

      <TasksTabsUI
        dailyTasks={dailyTasks}
        weeklyTasks={weeklyTasks}
        monthlyTasks={monthlyTasks}
        myAssignments={myAssignments}
        isAdmin={isAdmin}
      />
    </div>
  )
}
