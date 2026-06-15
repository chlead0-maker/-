'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { createQuickItem } from '@/lib/actions/tasks'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { ItemType } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  date: Date
  defaultType: ItemType
  isAdmin: boolean
  employees: { id: string; full_name: string }[]
  currentUserId: string
  onSuccess: () => void
}

export default function QuickAddModal({ open, onClose, date, defaultType, isAdmin, employees, currentUserId, onSuccess }: Props) {
  const [type, setType] = useState<ItemType>(defaultType)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [taskType, setTaskType] = useState('daily')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [assigneeId, setAssigneeId] = useState(currentUserId)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setTitle('')
    setPriority('medium')
    setTaskType('daily')
    setStartTime('')
    setEndTime('')
    setAssigneeId(currentUserId)
    setError(null)
    setType(defaultType)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('제목을 입력해주세요'); return }
    setError(null)

    startTransition(async () => {
      try {
        await createQuickItem({
          title: title.trim(),
          item_type: type,
          due_date: format(date, 'yyyy-MM-dd'),
          task_type: type === 'task' ? (taskType as 'daily' | 'weekly' | 'monthly') : 'daily',
          priority: type === 'task' ? (priority as 'low' | 'medium' | 'high' | 'urgent') : 'medium',
          start_time: type === 'event' && startTime ? startTime : undefined,
          end_time: type === 'event' && endTime ? endTime : undefined,
          assignee_ids: [assigneeId],
        })
        reset()
        onSuccess()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {format(date, 'M월 d일 (EEE)', { locale: ko })} 추가
          </DialogTitle>
        </DialogHeader>

        {/* 타입 토글 */}
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setType('task')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              type === 'task'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🟣 할일
          </button>
          <button
            type="button"
            onClick={() => setType('event')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              type === 'event'
                ? 'bg-sky-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🔵 일정
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>제목</Label>
            <Input
              placeholder={type === 'task' ? '할일 내용을 입력하세요' : '일정 이름을 입력하세요'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {type === 'task' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>유형</Label>
                <Select value={taskType} onValueChange={(v) => v && setTaskType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">데일리</SelectItem>
                    <SelectItem value="weekly">주간</SelectItem>
                    <SelectItem value="monthly">월간</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>우선순위</Label>
                <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">낮음</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="urgent">긴급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === 'event' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>시작 시간</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>종료 시간</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}

          {isAdmin && employees.length > 0 && (
            <div className="space-y-1.5">
              <Label>담당자</Label>
              <Select value={assigneeId} onValueChange={(v) => v && setAssigneeId(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name} {e.id === currentUserId ? '(나)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              추가
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
