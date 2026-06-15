import { redirect } from 'next/navigation'
import {
  format,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
} from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import ReportView from '@/components/reports/ReportView'
import type { Task, TaskAssignment, EmployeeStats, Profile } from '@/lib/types'

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

  // 직원: 본인 할당 업무만
  const { data: myA } = await supabase
    .from('task_assignments')
    .select('task_id')
    .eq('assignee_id', userId)
  const taskIds = (myA || []).map((a) => a.task_id)
  if (!taskIds.length) return []

  const { data } = await supabase
    .from('tasks')
    .select('*')
    .in('id', taskIds)
    .gte('due_date', from)
    .lte('due_date', to)
    .order('due_date', { ascending: true })
  return (data || []) as Task[]
}

async function fetchEmployeeStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string
): Promise<EmployeeStats[]> {
  const { data: employees } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name')

  if (!employees?.length) return []

  const stats: EmployeeStats[] = []
  for (const emp of employees) {
    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('status, task:tasks!inner(due_date, status)')
      .eq('assignee_id', emp.id)
      .gte('task.due_date', from)
      .lte('task.due_date', to)

    const total = assignments?.length || 0
    const completed = assignments?.filter((a) => a.status === 'completed').length || 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdue = assignments?.filter((a: any) => {
      const t = Array.isArray(a.task) ? a.task[0] : a.task
      return t?.status === 'overdue'
    }).length || 0

    stats.push({
      profile: emp as Profile,
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: total - completed,
      overdueTasks: overdue,
    })
  }
  return stats
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin'
  const today = new Date()

  // 기간 계산
  const dailyFrom = format(today, 'yyyy-MM-dd')
  const dailyTo = dailyFrom

  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const monthFrom = format(startOfMonth(today), 'yyyy-MM-dd')
  const monthTo = format(endOfMonth(today), 'yyyy-MM-dd')

  // 병렬 데이터 조회
  const [dailyTasks, weeklyTasks, monthlyTasks] = await Promise.all([
    fetchTasksForPeriod(supabase, dailyFrom, dailyTo, user.id, isAdmin),
    fetchTasksForPeriod(supabase, weekFrom, weekTo, user.id, isAdmin),
    fetchTasksForPeriod(supabase, monthFrom, monthTo, user.id, isAdmin),
  ])

  // 관리자: 직원별 통계 추가
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

  // 직원: 본인 할당 정보
  let myAllAssignments: TaskAssignment[] = []
  if (!isAdmin) {
    const { data } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('assignee_id', user.id)
    myAllAssignments = (data || []) as TaskAssignment[]
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
        daily={{ from: dailyFrom, to: dailyTo, tasks: dailyTasks, employeeStats: dailyStats, myAssignments: myAllAssignments }}
        weekly={{ from: weekFrom, to: weekTo, tasks: weeklyTasks, employeeStats: weeklyStats, myAssignments: myAllAssignments }}
        monthly={{ from: monthFrom, to: monthTo, tasks: monthlyTasks, employeeStats: monthlyStats, myAssignments: myAllAssignments }}
        isAdmin={isAdmin}
        profile={profile as Profile}
      />
    </div>
  )
}
