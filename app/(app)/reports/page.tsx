import { redirect } from 'next/navigation'
import {
  format,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
} from 'date-fns'
import { getAuthUser, getProfile } from '@/lib/supabase/cached'
import { createClient } from '@/lib/supabase/server'
import ReportView from '@/components/reports/ReportView'
import type { Task, TaskAssignment, TaskLog, EmployeeStats, Profile } from '@/lib/types'

async function fetchTasksForPeriod(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string,
  userId: string,
  isAdmin: boolean
): Promise<Task[]> {
  if (isAdmin) {
    const { data } = await supabase
      .from('tasks')
      .select('*, assignments:task_assignments(*, assignee:profiles(*))')
      .gte('due_date', from)
      .lte('due_date', to)
      .order('due_date', { ascending: true })
    return (data || []) as Task[]
  }

  const { data } = await supabase
    .from('task_assignments')
    .select('task:tasks!inner(*)')
    .eq('assignee_id', userId)
    .gte('task.due_date', from)
    .lte('task.due_date', to)
    .order('task.due_date', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((d: any) => {
    const t = Array.isArray(d.task) ? d.task[0] : d.task
    return t as Task
  }).filter(Boolean)
}

async function fetchEmployeeStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string
): Promise<EmployeeStats[]> {
  const [{ data: employees }, { data: allAssignments }] = await Promise.all([
    supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
    supabase.from('task_assignments')
      .select('assignee_id, status, task:tasks!inner(due_date, status)')
      .gte('task.due_date', from)
      .lte('task.due_date', to),
  ])

  return (employees || []).map((emp) => {
    const empA = (allAssignments || []).filter((a) => a.assignee_id === emp.id)
    const total = empA.length
    const completed = empA.filter((a) => a.status === 'completed').length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdue = empA.filter((a: any) => {
      const t = Array.isArray(a.task) ? a.task[0] : a.task
      return t?.status === 'overdue'
    }).length
    return {
      profile: emp as Profile,
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: total - completed,
      overdueTasks: overdue,
    }
  })
}

export default async function ReportsPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user || !profile) redirect('/login')

  const isAdmin = profile.role === 'admin'
  const today = new Date()
  const supabase = await createClient()

  const dailyFrom = format(today, 'yyyy-MM-dd')
  const dailyTo = dailyFrom
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthFrom = format(startOfMonth(today), 'yyyy-MM-dd')
  const monthTo = format(endOfMonth(today), 'yyyy-MM-dd')

  const [dailyTasks, weeklyTasks, monthlyTasks] = await Promise.all([
    fetchTasksForPeriod(supabase, dailyFrom, dailyTo, user.id, isAdmin),
    fetchTasksForPeriod(supabase, weekFrom, weekTo, user.id, isAdmin),
    fetchTasksForPeriod(supabase, monthFrom, monthTo, user.id, isAdmin),
  ])

  let dailyStats: EmployeeStats[] | undefined
  let weeklyStats: EmployeeStats[] | undefined
  let monthlyStats: EmployeeStats[] | undefined

  if (isAdmin) {
    ;[dailyStats, weeklyStats, monthlyStats] = await Promise.all([
      fetchEmployeeStats(supabase, dailyFrom, dailyTo),
      fetchEmployeeStats(supabase, weekFrom, weekTo),
      fetchEmployeeStats(supabase, monthFrom, monthTo),
    ])
  }

  let myAllAssignments: TaskAssignment[] = []
  if (!isAdmin) {
    const { data } = await supabase
      .from('task_assignments').select('*').eq('assignee_id', user.id)
    myAllAssignments = (data || []) as TaskAssignment[]
  }

  // 전체 task_id 수집 후 로그 한번에 조회
  const allTaskIds = [...new Set([
    ...dailyTasks.map((t) => t.id),
    ...weeklyTasks.map((t) => t.id),
    ...monthlyTasks.map((t) => t.id),
  ])]

  const taskLogsByTaskId: Record<string, TaskLog[]> = {}
  if (allTaskIds.length > 0) {
    const { data: logsData } = await supabase
      .from('task_logs')
      .select('*, author:profiles(*)')
      .in('task_id', allTaskIds)
      .order('created_at', { ascending: true })

    for (const log of (logsData || []) as TaskLog[]) {
      if (!taskLogsByTaskId[log.task_id]) taskLogsByTaskId[log.task_id] = []
      taskLogsByTaskId[log.task_id].push(log)
    }
  }

  function logsFor(tasks: Task[]): Record<string, TaskLog[]> {
    const result: Record<string, TaskLog[]> = {}
    for (const t of tasks) result[t.id] = taskLogsByTaskId[t.id] || []
    return result
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">업무 보고서</h1>
        <p className="text-gray-500 text-sm mt-1">
          {isAdmin ? '전체 팀 업무 현황을 기간별로 확인합니다' : '내 업무 진행 현황을 확인합니다'}
        </p>
      </div>

      <ReportView
        daily={{ from: dailyFrom, to: dailyTo, tasks: dailyTasks, employeeStats: dailyStats, myAssignments: myAllAssignments, taskLogs: logsFor(dailyTasks) }}
        weekly={{ from: weekFrom, to: weekTo, tasks: weeklyTasks, employeeStats: weeklyStats, myAssignments: myAllAssignments, taskLogs: logsFor(weeklyTasks) }}
        monthly={{ from: monthFrom, to: monthTo, tasks: monthlyTasks, employeeStats: monthlyStats, myAssignments: myAllAssignments, taskLogs: logsFor(monthlyTasks) }}
        isAdmin={isAdmin}
        profile={profile as Profile}
        currentUserId={user.id}
      />
    </div>
  )
}
