'use client'

import { useState } from 'react'
import { updateTaskAssignmentStatus } from '@/lib/actions/tasks'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface TaskCompletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignmentId: string
  taskId: string
  taskTitle: string
}

export default function TaskCompletionDialog({
  open,
  onOpenChange,
  assignmentId,
  taskId,
  taskTitle,
}: TaskCompletionDialogProps) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleComplete() {
    setLoading(true)
    try {
      await updateTaskAssignmentStatus(assignmentId, taskId, 'completed', notes)
      onOpenChange(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            업무 완료 처리
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-gray-900">{taskTitle}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label htmlFor="notes">완료 내용 (선택)</Label>
          <Textarea
            id="notes"
            placeholder="처리 내용, 결과, 참고 사항 등을 입력하세요..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            취소
          </Button>
          <Button onClick={handleComplete} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            완료 처리
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
