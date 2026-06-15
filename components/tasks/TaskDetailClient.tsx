'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { addComment, deleteTask, updateTaskStatus } from '@/lib/actions/tasks'
import type { TaskWithDetails, TaskAssignment, TaskComment } from '@/lib/types'
import TaskCompletionDialog from './TaskCompletionDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TaskDetailClientProps {
  task: TaskWithDetails
  comments: TaskComment[]
  myAssignment: TaskAssignment | undefined
  isAdmin: boolean
  userId: string
}

export default function TaskDetailClient({
  task,
  comments: initialComments,
  myAssignment,
  isAdmin,
  userId,
}: TaskDetailClientProps) {
  const [completionOpen, setCompletionOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const canComplete =
    myAssignment &&
    myAssignment.status !== 'completed' &&
    task.status !== 'cancelled'

  async function handleAddComment() {
    if (!commentText.trim()) return
    setCommentLoading(true)
    try {
      await addComment(task.id, commentText.trim())
      setCommentText('')
    } finally {
      setCommentLoading(false)
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      await deleteTask(task.id)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 직원: 완료 처리 버튼 */}
      {canComplete && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <Button
            onClick={() => setCompletionOpen(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            내 업무 완료 처리
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            완료 처리 시 관리자에게 자동으로 반영됩니다
          </p>
        </div>
      )}

      {myAssignment?.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">완료 처리됨</span>
            {myAssignment.completed_at && (
              <span className="text-xs text-green-600">
                {format(new Date(myAssignment.completed_at), 'M월 d일 HH:mm', { locale: ko })}
              </span>
            )}
          </div>
          {myAssignment.completion_notes && (
            <p className="text-sm text-green-800 mt-2">{myAssignment.completion_notes}</p>
          )}
        </div>
      )}

      {/* 관리자: 업무 삭제 */}
      {isAdmin && task.status !== 'cancelled' && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            업무 삭제
          </Button>
        </div>
      )}

      {/* 댓글 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">댓글</h2>
        <div className="space-y-4 mb-4">
          {initialComments.length === 0 ? (
            <p className="text-sm text-gray-400">댓글이 없습니다</p>
          ) : (
            initialComments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                    {(comment.author as { full_name: string })?.full_name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {(comment.author as { full_name: string })?.full_name || '알 수 없음'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(comment.created_at), 'M/d HH:mm', { locale: ko })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder="댓글을 입력하세요..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={2}
            className="flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleAddComment()
              }
            }}
          />
          <Button
            onClick={handleAddComment}
            disabled={commentLoading || !commentText.trim()}
            size="sm"
            className="self-end"
          >
            {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '전송'}
          </Button>
        </div>
      </div>

      {/* 완료 다이얼로그 */}
      {myAssignment && (
        <TaskCompletionDialog
          open={completionOpen}
          onOpenChange={setCompletionOpen}
          assignmentId={myAssignment.id}
          taskId={task.id}
          taskTitle={task.title}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>업무 삭제</DialogTitle>
            <DialogDescription>
              <span className="font-medium">{task.title}</span>을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
