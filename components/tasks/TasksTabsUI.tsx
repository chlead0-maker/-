'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buttonVariants } from '@/components/ui/button'
import TaskStatusBadge from '@/components/tasks/TaskStatusBadge'
import TaskPriorityBadge from '@/components/tasks/TaskPriorityBadge'
import { Plus } from 'lucide-react'
import type { Task, TaskAssignment } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TasksTabsUIProps {
  dailyTasks: Task[]
  weeklyTasks: Task[]
  monthlyTasks: Task[]
  myAssignments: TaskAssignment[]
  isAdmin: boolean
  defaultTab?: string
}

export default function TasksTabsUI({
  dailyTasks,
  weeklyTasks,
  monthlyTasks,
  myAssignments,
  isAdmin,
  defaultTab = 'daily',
}: TasksTabsUIProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  function TaskRow({ task }: { task: Task }) {
    const myAssignment = myAssignments.find((a) => a.task_id === task.id)
    const assigneeCount = task.assignments?.length || 0
    const completedCount = task.assignments?.filter((a) => a.status === 'completed').length || 0

    return (
      <Link
        href={`/tasks/${task.id}`}
        className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors last:border-0"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">{task.title}</span>
            <TaskPriorityBadge priority={task.priority} />
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-gray-400">
              마감: {format(new Date(task.due_date), 'M월 d일 (EEEE)', { locale: ko })}
            </span>
            {isAdmin && assigneeCount > 0 && (
              <span className="text-xs text-gray-400">
                담당자: {completedCount}/{assigneeCount} 완료
              </span>
            )}
          </div>
        </div>
        <div className="ml-4 flex items-center gap-2">
          <TaskStatusBadge
            status={myAssignment?.status === 'completed' ? 'completed' : task.status}
          />
        </div>
      </Link>
    )
  }

  function TaskList({ tasks }: { tasks: Task[] }) {
    if (tasks.length === 0) {
      return (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">업무가 없습니다</p>
          {isAdmin && (
            <Link
              href="/tasks/new"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 inline-flex items-center gap-2')}
            >
              <Plus className="h-4 w-4" />
              업무 생성
            </Link>
          )}
        </div>
      )
    }
    return (
      <div>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="daily">데일리 ({dailyTasks.length})</TabsTrigger>
        <TabsTrigger value="weekly">주간 ({weeklyTasks.length})</TabsTrigger>
        <TabsTrigger value="monthly">월간 ({monthlyTasks.length})</TabsTrigger>
      </TabsList>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <TabsContent value="daily">
          <TaskList tasks={dailyTasks} />
        </TabsContent>
        <TabsContent value="weekly">
          <TaskList tasks={weeklyTasks} />
        </TabsContent>
        <TabsContent value="monthly">
          <TaskList tasks={monthlyTasks} />
        </TabsContent>
      </div>
    </Tabs>
  )
}
