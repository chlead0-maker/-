import { Badge } from '@/components/ui/badge'
import type { TaskPriority } from '@/lib/types'

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  low: { label: '낮음', className: 'bg-slate-100 text-slate-600 hover:bg-slate-100' },
  medium: { label: '보통', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
  high: { label: '높음', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  urgent: { label: '긴급', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
}

export default function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = priorityConfig[priority]
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  )
}
