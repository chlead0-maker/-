'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, parseISO,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DayPanel from './DayPanel'
import QuickAddModal from './QuickAddModal'
import type { Task, TaskAssignment, ItemType } from '@/lib/types'

interface Props {
  isAdmin: boolean
  currentUserId: string
  employees: { id: string; full_name: string }[]
}

const DAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일']

export default function CalendarView({ isAdmin, currentUserId, employees }: Props) {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [items, setItems] = useState<Task[]>([])
  const [myAssignments, setMyAssignments] = useState<TaskAssignment[]>([])
  const [modalState, setModalState] = useState<{ date: Date; type: ItemType } | null>(null)

  const fetchItems = useCallback(async () => {
    const from = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const to = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    // 내 assignments는 항상 조회 (완료 버튼용)
    const { data: assignmentsData } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('assignee_id', currentUserId)
    setMyAssignments((assignmentsData || []) as TaskAssignment[])

    if (isAdmin) {
      const { data } = await supabase
        .from('tasks')
        .select('*, assignments:task_assignments(*, assignee:profiles(*))')
        .gte('due_date', from)
        .lte('due_date', to)
        .order('due_date')
      setItems((data || []) as Task[])
    } else {
      const taskIds = (assignmentsData || []).map((a) => a.task_id)
      if (!taskIds.length) { setItems([]); return }
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds)
        .gte('due_date', from)
        .lte('due_date', to)
        .order('due_date')
      setItems((data || []) as Task[])
    }
  }, [currentDate, isAdmin, currentUserId, supabase])

  useEffect(() => { fetchItems() }, [fetchItems])

  const calStart = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
  const calEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getItemsForDay(day: Date) {
    return items.filter((item) => isSameDay(parseISO(item.due_date), day))
  }

  function handleDayClick(day: Date) {
    setSelectedDate((prev) => (prev && isSameDay(prev, day) ? null : day))
  }

  function handleAdd(type: ItemType) {
    if (!selectedDate) return
    setModalState({ date: selectedDate, type })
  }

  return (
    <div className="flex flex-1 overflow-hidden gap-0 min-h-0">
      {/* 캘린더 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentDate, 'yyyy년 M월', { locale: ko })}
          </h2>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="flex-1 grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden">
          {days.map((day) => {
            const dayItems = getItemsForDay(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
            const today = isToday(day)
            const events = dayItems.filter((i) => i.item_type === 'event')
            const tasks = dayItems.filter((i) => i.item_type !== 'event')
            const MAX_CHIPS = 3
            const allChips = [...events, ...tasks]
            const visibleChips = allChips.slice(0, MAX_CHIPS)
            const hiddenCount = allChips.length - MAX_CHIPS

            return (
              <div
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`bg-white p-2 cursor-pointer transition-colors hover:bg-gray-50 min-h-[90px]
                  ${isSelected ? 'bg-indigo-50 hover:bg-indigo-50' : ''}`}
              >
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1.5
                  ${today ? 'bg-indigo-600 text-white' : ''}
                  ${!today && isCurrentMonth ? 'text-gray-900' : ''}
                  ${!isCurrentMonth ? 'text-gray-300' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {visibleChips.map((item) => (
                    <div key={item.id} className={`text-[11px] px-1.5 py-0.5 rounded truncate leading-tight
                      ${item.item_type === 'event'
                        ? 'bg-sky-100 text-sky-700'
                        : item.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-indigo-100 text-indigo-700'
                      }`}>
                      {item.item_type === 'event' && item.start_time
                        ? `${item.start_time.slice(0, 5)} ${item.title}`
                        : item.title}
                    </div>
                  ))}
                  {hiddenCount > 0 && (
                    <p className="text-[10px] text-gray-400 px-1">+{hiddenCount}개 더</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 범례 */}
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-100 inline-block" /> 할일
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-100 inline-block" /> 일정
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-100 inline-block" /> 완료
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-100 inline-block" /> 지연
          </span>
        </div>
      </div>

      {/* 날짜 상세 패널 */}
      {selectedDate && (
        <DayPanel
          date={selectedDate}
          items={getItemsForDay(selectedDate)}
          myAssignments={myAssignments}
          currentUserId={currentUserId}
          onClose={() => setSelectedDate(null)}
          onAdd={handleAdd}
          onRefresh={fetchItems}
        />
      )}

      {/* 빠른 추가 모달 */}
      {modalState && (
        <QuickAddModal
          open={true}
          onClose={() => setModalState(null)}
          date={modalState.date}
          defaultType={modalState.type}
          isAdmin={isAdmin}
          employees={employees}
          currentUserId={currentUserId}
          onSuccess={fetchItems}
        />
      )}
    </div>
  )
}
