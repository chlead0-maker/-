import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  description?: string
  colorClass?: string
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  colorClass = 'text-indigo-600',
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', colorClass)} />
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', colorClass)}>{value}</div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
