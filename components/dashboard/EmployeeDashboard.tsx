'use client'

import Link from 'next/link'
import { format, isToday, isThisWeek } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CheckCircle2, Clock, ClipboardList } from 'lucide-react'
import StatsCard from './StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import TaskStatusBadge from '@/components/tasks/TaskStatusBadge'
import TaskPriorityBadge from '@/components/tasks/TaskPriorityBadge'
import { useRealtimeTasks } from '@/lib/hooks/useRealtimeTasks'
import type { Task, TaskAssignment } from '@/lib/types'

interface EmployeeDashboardProps {
  initialTasks: Task[]
  myAssignments: TaskAssignment[]
  userId: string
}

export default function EmployeeDashboard({
  initialTasks,
  myAssignments,
  userId,
}: EmployeeDashboardProps) {
  const tasks = useRealtimeTasks(initialTasks)

  const assignedTaskIds = new Set(myAssignments.map((a) => a.task_id))
  const myTasks = tasks.filter((t) => assignedTaskIds.has(t.id))

  const todayTasks = myTasks.filter((t) => isToday(new Date(t.due_date)))
  const weekTasks = myTasks.filter(
    (t) => isThisWeek(new Date(t.due_date), { weekStartsOn: 1 }) && !isToday(new Date(t.due_date))
  )

  const stats = {
    total: myTasks.length,
    completed: myTasks.filter((t) => {
      const assignment = myAssignments.find((a) => a.task_id === t.id)
      return assignment?.status === 'completed'
    }).length,
    pending: myTasks.filter((t) => {
      const assignment = myAssignments.find((a) => a.task_id === t.id)
      return assignment?.status !== 'completed'
    }).length,
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">내 업무</h1>
        <p className="text-gray-500 text-sm mt-1">
          {format(new Date(), 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="전체 할당 업무"
          value={stats.total}
          icon={ClipboardList}
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
          title="남은 업무"
          value={stats.pending}
          icon={Clock}
          description="처리 필요"
          colorClass="text-yellow-600"
        />
      </div>

      {/* 오늘 업무 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">오늘 마감 업무 ({todayTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {todayTasks.length === 0 ? (
            <p className="text-sm text-gray-500">오늘 마감 업무가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => {
                const assignment = myAssignments.find((a) => a.task_id === task.id)
                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{task.description}</p>
                      )}
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <TaskPriorityBadge priority={task.priority} />
                      <TaskStatusBadge
                        status={
                          assignment?.status === 'completed' ? 'completed' : task.status
                        }
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 이번 주 업무 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">이번 주 업무 ({weekTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {weekTasks.length === 0 ? (
            <p className="text-sm text-gray-500">이번 주 남은 업무가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {weekTasks.map((task) => {
                const assignment = myAssignments.find((a) => a.task_id === task.id)
                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        마감: {format(new Date(task.due_date), 'M월 d일 (EEEE)', { locale: ko })}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <TaskPriorityBadge priority={task.priority} />
                      <TaskStatusBadge
                        status={
                          assignment?.status === 'completed' ? 'completed' : task.status
                        }
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
