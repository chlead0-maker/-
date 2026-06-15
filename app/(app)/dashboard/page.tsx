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
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  if (profile.role === 'admin') {
    // 관리자: 전체 업무 + 직원별 통계
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*, assignments:task_assignments(*, assignee:profiles(*))')
      .order('created_at', { ascending: false })

    // 이번 주 직원별 통계
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

    const { data: employees } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'employee')
      .eq('is_active', true)

    const employeeStats: EmployeeStats[] = []
    if (employees) {
      for (const emp of employees) {
        const { data: assignments } = await supabase
          .from('task_assignments')
          .select('*, task:tasks!inner(due_date, status)')
          .eq('assignee_id', emp.id)
          .gte('task.due_date', weekStart)
          .lte('task.due_date', weekEnd)

        const total = assignments?.length || 0
        const completed = assignments?.filter((a) => a.status === 'completed').length || 0
        const overdue = assignments?.filter(
          (a: { task: { status: string } }) => a.task?.status === 'overdue'
        ).length || 0

        employeeStats.push({
          profile: emp as Profile,
          totalTasks: total,
          completedTasks: completed,
          pendingTasks: total - completed,
          overdueTasks: overdue,
        })
      }
    }

    return (
      <AdminDashboard
        initialTasks={(tasks || []) as Task[]}
        employeeStats={employeeStats}
      />
    )
  }

  // 직원: 본인 업무만
  const { data: myAssignments } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('assignee_id', user.id)

  const taskIds = (myAssignments || []).map((a) => a.task_id)
  let myTasks: Task[] = []
  if (taskIds.length > 0) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .in('id', taskIds)
      .order('due_date', { ascending: true })
    myTasks = (data || []) as Task[]
  }

  return (
    <EmployeeDashboard
      initialTasks={myTasks}
      myAssignments={(myAssignments || []) as TaskAssignment[]}
      userId={user.id}
    />
  )
}
