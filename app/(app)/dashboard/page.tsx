import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser, getProfile } from '@/lib/supabase/cached'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard'
import type { Task, TaskAssignment, EmployeeStats, Profile } from '@/lib/types'
import { startOfWeek, endOfWeek, format, subDays } from 'date-fns'

export default async function DashboardPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user || !profile) redirect('/login')

  const canViewAll = profile.role === 'admin' || profile.role === 'team_lead'
  const supabase = await createClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  if (canViewAll) {
    // 오늘 업무 + 지연 업무 + 직원 통계 병렬 조회
    // 전체 기간 대신 오늘/지연만 가져와 payload 대폭 감소
    const [
      { data: todayTasksData },
      { data: overdueData },
      { data: employees },
      { data: weekAssignments },
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, due_date, status, priority, task_type, item_type, created_at, updated_at, description, notes, location, start_time, end_time, assigned_to_team, created_by, completed_at, completion_notes, assignments:task_assignments(id, status, completed_at, assignee_id, assignee:profiles(id, full_name))')
        .eq('due_date', today)
        .order('created_at', { ascending: false }),
      supabase
        .from('tasks')
        .select('id, title, due_date, status, priority, task_type, item_type, created_at, updated_at, description, notes, location, start_time, end_time, assigned_to_team, created_by, completed_at, completion_notes, assignments:task_assignments(id, status, completed_at, assignee_id, assignee:profiles(id, full_name))')
        .eq('status', 'overdue')
        .order('due_date', { ascending: true })
        .limit(20),
      supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .neq('role', 'admin')
        .order('full_name'),
      supabase
        .from('task_assignments')
        .select('assignee_id, status, task:tasks!inner(due_date, status)')
        .gte('task.due_date', weekStart)
        .lte('task.due_date', weekEnd),
    ])

    // 오늘 + 지연 업무 합쳐서 중복 제거
    const seenIds = new Set<string>()
    const allTasks: Task[] = []
    for (const t of [...(todayTasksData || []), ...(overdueData || [])]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!seenIds.has(t.id)) { seenIds.add(t.id); allTasks.push(t as unknown as Task) }
    }

    const employeeStats: EmployeeStats[] = (employees || []).map((emp) => {
      const empA = (weekAssignments || []).filter((a) => a.assignee_id === emp.id)
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

    return <AdminDashboard initialTasks={allTasks} employeeStats={employeeStats} />
  }

  // 직원: 본인 assignments만
  const { data: myData } = await supabase
    .from('task_assignments')
    .select('*, task:tasks!inner(*)')
    .eq('assignee_id', user.id)
    .order('task.due_date', { ascending: true })

  const myAssignments = (myData || []) as TaskAssignment[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myTasks = (myData || []).map((d: any) => {
    const t = Array.isArray(d.task) ? d.task[0] : d.task
    return t as Task
  }).filter(Boolean)

  return (
    <EmployeeDashboard
      initialTasks={myTasks}
      myAssignments={myAssignments}
      userId={user.id}
    />
  )
}
