import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
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
  isAdmin: boolean
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

  let query = supabase
    .from('tasks')
    .select('*, assignments:task_assignments(*, assignee:profiles(*))')
    .eq('task_type', type)
    .gte('due_date', from)
    .lte('due_date', to)
    .order('due_date', { ascending: true })

  if (!isAdmin) {
    const { data: myAssignments } = await supabase
      .from('task_assignments')
      .select('task_id')
      .eq('assignee_id', userId)
    const taskIds = (myAssignments || []).map((a) => a.task_id)
    if (taskIds.length === 0) return []
    query = query.in('id', taskIds)
  }

  const { data } = await query
  return (data || []) as Task[]
}

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const { data: myAssignmentsAll } = isAdmin
    ? { data: [] }
    : await supabase
        .from('task_assignments')
        .select('*')
        .eq('assignee_id', user.id)

  const [dailyTasks, weeklyTasks, monthlyTasks] = await Promise.all([
    fetchTasks(supabase, 'daily', user.id, isAdmin),
    fetchTasks(supabase, 'weekly', user.id, isAdmin),
    fetchTasks(supabase, 'monthly', user.id, isAdmin),
  ])

  const myAssignments = (myAssignmentsAll || []) as TaskAssignment[]

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
