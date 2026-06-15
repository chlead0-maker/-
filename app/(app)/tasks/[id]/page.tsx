import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getAuthUser, getProfile } from '@/lib/supabase/cached'
import { createClient } from '@/lib/supabase/server'
import TaskStatusBadge from '@/components/tasks/TaskStatusBadge'
import TaskPriorityBadge from '@/components/tasks/TaskPriorityBadge'
import TaskDetailClient from '@/components/tasks/TaskDetailClient'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import TaskLogSection from '@/components/tasks/TaskLogSection'
import type { TaskWithDetails, TaskComment, TaskLog, Profile } from '@/lib/types'

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user || !profile) redirect('/login')

  const isAdmin = profile.role === 'admin'
  const supabase = await createClient()

  const { data: task } = await supabase
    .from('tasks')
    .select(`
      *,
      assignments:task_assignments(*, assignee:profiles(*)),
      team:teams(*),
      creator:profiles!tasks_created_by_fkey(*)
    `)
    .eq('id', id)
    .single()

  if (!task) notFound()

  const [{ data: comments }, { data: logs }] = await Promise.all([
    supabase.from('task_comments')
      .select('*, author:profiles(*)')
      .eq('task_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('task_logs')
      .select('*, author:profiles(*)')
      .eq('task_id', id)
      .order('created_at', { ascending: true }),
  ])

  const myAssignment = task.assignments?.find(
    (a: { assignee_id: string }) => a.assignee_id === user.id
  )

  const typeLabel: Record<string, string> = {
    daily: '데일리',
    weekly: '주간',
    monthly: '월간',
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href="/tasks"
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        업무 목록으로
      </Link>

      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900 flex-1">{task.title}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <TaskPriorityBadge priority={task.priority} />
            <TaskStatusBadge status={task.status} />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <Badge variant="outline">{typeLabel[task.task_type]}</Badge>
          <span>마감: {format(new Date(task.due_date), 'yyyy년 M월 d일 (EEEE)', { locale: ko })}</span>
          {task.creator && <span>생성: {(task.creator as Profile).full_name}</span>}
        </div>
      </div>

      {/* 상세 내용 */}
      {task.description && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      {/* 담당자 목록 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">담당자</h2>
        {task.assignments && task.assignments.length > 0 ? (
          <div className="space-y-2">
            {task.assignments.map((assignment: {
              id: string
              assignee_id: string
              status: string
              completed_at: string | null
              completion_notes: string | null
              assignee: Profile
            }) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                      {assignment.assignee?.full_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {assignment.assignee?.full_name || '알 수 없음'}
                    </p>
                    {assignment.status === 'completed' && assignment.completion_notes && (
                      <p className="text-xs text-gray-500 mt-0.5">{assignment.completion_notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {assignment.status === 'completed' && assignment.completed_at && (
                    <span className="text-xs text-gray-400">
                      {format(new Date(assignment.completed_at), 'M/d HH:mm')}
                    </span>
                  )}
                  <Badge
                    variant="secondary"
                    className={
                      assignment.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : assignment.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }
                  >
                    {assignment.status === 'completed'
                      ? '완료'
                      : assignment.status === 'in_progress'
                      ? '진행중'
                      : '대기중'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">담당자가 없습니다</p>
        )}
      </div>

      {/* 특이사항 / 진행 메모 */}
      <TaskLogSection
        taskId={id}
        initialLogs={(logs || []) as TaskLog[]}
        currentUserId={user.id}
        isAdmin={isAdmin}
      />

      {/* 완료 처리 + 댓글 (클라이언트 컴포넌트) */}
      <TaskDetailClient
        task={task as TaskWithDetails}
        comments={(comments || []) as TaskComment[]}
        myAssignment={myAssignment}
        isAdmin={isAdmin}
        userId={user.id}
      />
    </div>
  )
}
