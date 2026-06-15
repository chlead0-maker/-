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

type AssignRow = {
  assignee_id: string
  status: string
  task: { due_date: string; status: string } | { due_date: string; status: string }[]
}

export default async function ReportsPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user || !profile) redirect('/login')

  const isAdmin = profile.role === 'admin'
  const canViewAll = profile.role === 'admin' || profile.role === 'team_lead'
  const today = new Date()
  const supabase = await createClient()

  const dailyFrom = format(today, 'yyyy-MM-dd')
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthFrom = format(startOfMonth(today), 'yyyy-MM-dd')
  const monthTo = format(endOfMonth(today), 'yyyy-MM-dd')

  // 월 범위 1회 조회 — daily/weekly/monthly 모두 커버
  let allMonthTasks: Task[] = []
  let employees: Profile[] = []
  let assignRows: AssignRow[] = []
  let myAllAssignments: TaskAssignment[] = []

  if (canViewAll) {
    const [{ data: tasksData }, { data: empData }, { data: assignData }] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, assignments:task_assignments(*, assignee:profiles(*))')
        .gte('due_date', monthFrom)
        .lte('due_date', monthTo)
        .order('due_date', { ascending: true }),
      supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
      supabase
        .from('task_assignments')
        .select('assignee_id, status, task:tasks!inner(due_date, status)')
        .gte('task.due_date', monthFrom)
        .lte('task.due_date', monthTo),
    ])
    allMonthTasks = (tasksData || []) as Task[]
    employees = (empData || []) as Profile[]
    assignRows = (assignData || []) as unknown as AssignRow[]
  } else {
    const [{ data: taskData }, { data: myData }] = await Promise.all([
      supabase
        .from('task_assignments')
        .select('task:tasks!inner(*)')
        .eq('assignee_id', user.id)
        .gte('task.due_date', monthFrom)
        .lte('task.due_date', monthTo),
      supabase.from('task_assignments').select('*').eq('assignee_id', user.id),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allMonthTasks = ((taskData || []) as any[]).map((d) => {
      const t = Array.isArray(d.task) ? d.task[0] : d.task
      return t as Task
    }).filter(Boolean)
    myAllAssignments = (myData || []) as TaskAssignment[]
  }

  // JS 필터링 — DB 왕복 없음
  const dailyTasks = allMonthTasks.filter((t) => t.due_date === dailyFrom)
  const weeklyTasks = allMonthTasks.filter((t) => t.due_date >= weekFrom && t.due_date <= weekTo)
  const monthlyTasks = allMonthTasks

  function computeStats(from: string, to: string): EmployeeStats[] {
    return employees.map((emp) => {
      const empA = assignRows.filter((a) => {
        const t = Array.isArray(a.task) ? a.task[0] : a.task
        return a.assignee_id === emp.id && t?.due_date >= from && t?.due_date <= to
      })
      const total = empA.length
      const completed = empA.filter((a) => a.status === 'completed').length
      const overdue = empA.filter((a) => {
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

  const dailyStats = canViewAll ? computeStats(dailyFrom, dailyFrom) : undefined
  const weeklyStats = canViewAll ? computeStats(weekFrom, weekTo) : undefined
  const monthlyStats = canViewAll ? computeStats(monthFrom, monthTo) : undefined

  // 월 전체 태스크 ID로 로그 1회 일괄 조회
  const allTaskIds = [...new Set(allMonthTasks.map((t) => t.id))]

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
        daily={{ from: dailyFrom, to: dailyFrom, tasks: dailyTasks, employeeStats: dailyStats, myAssignments: myAllAssignments, taskLogs: logsFor(dailyTasks) }}
        weekly={{ from: weekFrom, to: weekTo, tasks: weeklyTasks, employeeStats: weeklyStats, myAssignments: myAllAssignments, taskLogs: logsFor(weeklyTasks) }}
        monthly={{ from: monthFrom, to: monthTo, tasks: monthlyTasks, employeeStats: monthlyStats, myAssignments: myAllAssignments, taskLogs: logsFor(monthlyTasks) }}
        isAdmin={canViewAll}
        profile={profile as Profile}
        currentUserId={user.id}
      />
    </div>
  )
}
