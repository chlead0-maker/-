'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CheckCircle2, Clock, AlertTriangle, ClipboardList, Plus } from 'lucide-react'
import StatsCard from './StatsCard'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TaskStatusBadge from '@/components/tasks/TaskStatusBadge'
import TaskPriorityBadge from '@/components/tasks/TaskPriorityBadge'
import { useRealtimeTasks } from '@/lib/hooks/useRealtimeTasks'
import type { Task, EmployeeStats } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AdminDashboardProps {
  initialTasks: Task[]
  employeeStats: EmployeeStats[]
}

export default function AdminDashboard({ initialTasks, employeeStats }: AdminDashboardProps) {
  const tasks = useRealtimeTasks(initialTasks)
  const today = new Date().toISOString().split('T')[0]
  const todayTasks = tasks.filter((t) => t.due_date === today)

  const stats = {
    total: todayTasks.length,
    completed: todayTasks.filter((t) => t.status === 'completed').length,
    pending: todayTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
    overdue: tasks.filter((t) => t.status === 'overdue').length,
  }

  const recentOverdue = tasks.filter((t) => t.status === 'overdue').slice(0, 5)

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(), 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
          </p>
        </div>
        <Link href="/tasks/new" className={cn(buttonVariants(), 'flex items-center gap-2')}>
          <Plus className="h-4 w-4" />
          업무 생성
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="오늘 총 업무"
          value={stats.total}
          icon={ClipboardList}
          description="오늘 마감 업무"
          colorClass="text-indigo-600"
        />
        <StatsCard
          title="완료"
          value={stats.completed}
          icon={CheckCircle2}
          description={`완료율 ${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%`}
          colorClass="text-green-600"
        />
        <StatsCard
          title="진행중/대기"
          value={stats.pending}
          icon={Clock}
          description="처리 필요"
          colorClass="text-yellow-600"
        />
        <StatsCard
          title="기한 초과"
          value={stats.overdue}
          icon={AlertTriangle}
          description="즉시 확인 필요"
          colorClass="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 직원별 현황 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">직원별 업무 현황 (이번 주)</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeStats.length === 0 ? (
              <p className="text-sm text-gray-500">직원이 없습니다</p>
            ) : (
              <div className="space-y-4">
                {employeeStats.map(({ profile, totalTasks, completedTasks, overdueTasks }) => {
                  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                  const initials = profile.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                  return (
                    <div key={profile.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-medium">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{profile.full_name}</span>
                          <span className="text-xs text-gray-500">
                            {completedTasks}/{totalTasks}
                            {overdueTasks > 0 && (
                              <span className="text-red-500 ml-2">지연 {overdueTasks}</span>
                            )}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 지연 업무 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">기한 초과 업무</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOverdue.length === 0 ? (
              <p className="text-sm text-gray-500">기한 초과 업무가 없습니다</p>
            ) : (
              <div className="space-y-3">
                {recentOverdue.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-start justify-between p-3 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        마감: {format(new Date(task.due_date), 'M월 d일', { locale: ko })}
                      </p>
                    </div>
                    <div className="ml-3 flex flex-col items-end gap-1">
                      <TaskPriorityBadge priority={task.priority} />
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 오늘 전체 업무 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">오늘의 업무</CardTitle>
          <Link href="/tasks" className="text-sm text-indigo-600 hover:text-indigo-800">
            전체 보기 →
          </Link>
        </CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-gray-500">오늘 마감 업무가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 8).map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <TaskPriorityBadge priority={task.priority} />
                    <TaskStatusBadge status={task.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
