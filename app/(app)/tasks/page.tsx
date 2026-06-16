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

export default async function TasksPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user || !profile) redirect('/login')

  const isAdmin = profile.role === 'admin'
  const canAssign = profile.role === 'admin' || profile.role === 'team_lead'
  const canViewAll = canAssign
  const supabase = await createClient()

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd')

  // 1회 조회 후 JS 필터 — daily/weekly/monthly 모두 월 범위 내에 포함됨
  let allTasks: Task[] = []
  let myAssignments: TaskAssignment[] = []

  if (canViewAll) {
    const { data } = await supabase
      .from('tasks')
      .select('*, assignments:task_assignments(*, assignee:profiles(*))')
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd)
      .order('due_date', { ascending: true })
    allTasks = (data || []) as Task[]
  } else {
    const [{ data: taskData }, { data: myData }] = await Promise.all([
      supabase
        .from('task_assignments')
        .select('task:tasks!inner(*)')
        .eq('assignee_id', user.id)
        .gte('task.due_date', monthStart)
        .lte('task.due_date', monthEnd),
      supabase.from('task_assignments').select('*').eq('assignee_id', user.id),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allTasks = ((taskData || []) as any[]).map((d) => {
      const t = Array.isArray(d.task) ? d.task[0] : d.task
      return t as Task
    }).filter(Boolean)
    myAssignments = (myData || []) as TaskAssignment[]
  }

  const dailyTasks = allTasks.filter((t) => t.task_type === 'daily' && t.due_date === todayStr)
  const weeklyTasks = allTasks.filter((t) => t.task_type === 'weekly' && t.due_date >= weekStart && t.due_date <= weekEnd)
  const monthlyTasks = allTasks.filter((t) => t.task_type === 'monthly')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">업무 목록</h1>
        {canAssign && (
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
        isAdmin={canAssign}
      />
    </div>
  )
}
