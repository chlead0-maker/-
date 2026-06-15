import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard'
import type { Task, TaskAssignment, EmployeeStats, Profile } from '@/lib/types'
import { startOfWeek, endOfWeek, format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  if (profile.role === 'admin') {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

    // 3개 쿼리 병렬 실행 (기존: 순차 + N+1)
    const [{ data: tasks }, { data: employees }, { data: weekAssignments }] = await Promise.all([
      supabase.from('tasks')
        .select('*, assignments:task_assignments(*, assignee:profiles(*))')
        .order('created_at', { ascending: false }),
      supabase.from('profiles')
        .select('*').eq('role', 'employee').eq('is_active', true),
      supabase.from('task_assignments')
        .select('assignee_id, status, task:tasks!inner(due_date, status)')
        .gte('task.due_date', weekStart)
        .lte('task.due_date', weekEnd),
    ])

    // JS에서 집계 (DB 왕복 없음)
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

    return (
      <AdminDashboard
        initialTasks={(tasks || []) as Task[]}
        employeeStats={employeeStats}
      />
    )
  }

  // 직원: 조인으로 1회 쿼리 (기존: 2회 순차)
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
