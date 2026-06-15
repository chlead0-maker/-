import { Badge } from '@/components/ui/badge'
import type { TaskStatus } from '@/lib/types'

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: '대기중', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
  in_progress: { label: '진행중', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  completed: { label: '완료', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  overdue: { label: '지연', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  cancelled: { label: '취소', className: 'bg-gray-100 text-gray-400 hover:bg-gray-100' },
}

export default function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  )
}
