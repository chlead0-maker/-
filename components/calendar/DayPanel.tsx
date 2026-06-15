'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'
import { Plus, X, CheckCircle2, Clock, Circle } from 'lucide-react'
import type { Task, ItemType } from '@/lib/types'

interface Props {
  date: Date
  items: Task[]
  onClose: () => void
  onAdd: (type: ItemType) => void
}

const statusColor: Record<string, string> = {
  pending: 'text-gray-500',
  in_progress: 'text-blue-600',
  completed: 'text-green-600',
  overdue: 'text-red-600',
  cancelled: 'text-gray-400 line-through',
}

const statusLabel: Record<string, string> = {
  pending: '대기',
  in_progress: '진행중',
  completed: '완료',
  overdue: '지연',
  cancelled: '취소',
}

export default function DayPanel({ date, items, onClose, onAdd }: Props) {
  const events = items.filter((i) => i.item_type === 'event').sort((a, b) =>
    (a.start_time || '99:99').localeCompare(b.start_time || '99:99')
  )
  const tasks = items.filter((i) => i.item_type !== 'event')

  return (
    <div className="w-72 border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {format(date, 'M월 d일', { locale: ko })}
          </p>
          <p className="text-xs text-gray-400">
            {format(date, 'EEEE', { locale: ko })}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 추가 버튼 */}
      <div className="flex gap-2 px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => onAdd('task')}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          할일 추가
        </button>
        <button
          onClick={() => onAdd('event')}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-medium hover:bg-sky-100 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          일정 추가
        </button>
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">항목이 없습니다</p>
        ) : (
          <>
            {/* 일정 */}
            {events.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-sky-600 mb-2 uppercase tracking-wide">일정</p>
                <div className="space-y-2">
                  {events.map((item) => (
                    <Link
                      key={item.id}
                      href={`/tasks/${item.id}`}
                      className="flex items-start gap-2 p-2 rounded-lg hover:bg-sky-50 transition-colors group"
                    >
                      <div className="h-4 w-4 rounded-full bg-sky-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{item.title}</p>
                        {item.start_time && (
                          <p className="text-xs text-sky-600 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {item.start_time.slice(0, 5)}
                            {item.end_time ? ` ~ ${item.end_time.slice(0, 5)}` : ''}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 할일 */}
            {tasks.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-indigo-600 mb-2 uppercase tracking-wide">할일</p>
                <div className="space-y-2">
                  {tasks.map((item) => (
                    <Link
                      key={item.id}
                      href={`/tasks/${item.id}`}
                      className="flex items-start gap-2 p-2 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className={`h-4 w-4 mt-0.5 shrink-0 ${item.status === 'overdue' ? 'text-red-400' : 'text-gray-300'}`} />
                      )}
                      <div className="min-w-0">
                        <p className={`text-sm truncate ${item.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {item.title}
                        </p>
                        <p className={`text-xs mt-0.5 ${statusColor[item.status]}`}>
                          {statusLabel[item.status]}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
