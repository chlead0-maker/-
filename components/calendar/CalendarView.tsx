'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  canViewAll: boolean
  isAdmin: boolean
  currentUserId: string
  employees: { id: string; full_name: string }[]
  initialItems?: Task[]
  initialAssignments?: TaskAssignment[]
}

const DAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일']

export default function CalendarView({ canViewAll, isAdmin, currentUserId, employees, initialItems = [], initialAssignments = [] }: Props) {
  // useMemo로 안정적인 참조 — 매 렌더마다 새 객체가 생성되는 것을 방지
  const supabase = useMemo(() => createClient(), [])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [items, setItems] = useState<Task[]>(initialItems)
  const [myAssignments, setMyAssignments] = useState<TaskAssignment[]>(initialAssignments)
  const [modalState, setModalState] = useState<{ date: Date; type: ItemType } | null>(null)
  // 서버에서 이미 이번 달 데이터를 받았으므로 첫 마운트 fetch 스킵
  const [skipInitialFetch, setSkipInitialFetch] = useState(initialItems.length > 0)

  const fetchItems = useCallback(async () => {
    const from = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const to = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    if (canViewAll) {
      // 관리자/팀장: 전체 조회 + 내 assignments 병렬
      const [{ data: tasksData }, { data: assignmentsData }] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, creator:profiles!created_by(id,full_name), assignments:task_assignments(*, assignee:profiles!assignee_id(*))')
          .gte('due_date', from)
          .lte('due_date', to)
          .order('due_date'),
        supabase
          .from('task_assignments')
          .select('*')
          .eq('assignee_id', currentUserId),
      ])
      setItems((tasksData || []) as Task[])
      setMyAssignments((assignmentsData || []) as TaskAssignment[])
    } else {
      // 직원: 내 assignments 전체 + 해당 월 tasks 병렬
      const [{ data: assignmentsData }, { data: dateTasksData }] = await Promise.all([
        supabase
          .from('task_assignments')
          .select('*')
          .eq('assignee_id', currentUserId),
        supabase
          .from('task_assignments')
          .select('task:tasks!inner(*)')
          .eq('assignee_id', currentUserId)
          .gte('task.due_date', from)
          .lte('task.due_date', to),
      ])
      setMyAssignments((assignmentsData || []) as TaskAssignment[])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setItems(((dateTasksData || []) as any[]).map((d) => {
        const t = Array.isArray(d.task) ? d.task[0] : d.task
        return t as Task
      }).filter(Boolean))
    }
  }, [currentDate, canViewAll, currentUserId, supabase])

  useEffect(() => {
    if (skipInitialFetch) {
      setSkipInitialFetch(false)
      return
    }
    fetchItems()
  }, [fetchItems]) // eslint-disable-line react-hooks/exhaustive-deps

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
            const incompleteTasks = dayItems.filter((i) => {
              if (i.item_type === 'event') return false
              const a = myAssignments.find((a) => a.task_id === i.id)
              return !(a?.status === 'completed' || i.status === 'completed')
            })
            const completedTasks = dayItems.filter((i) => {
              if (i.item_type === 'event') return false
              const a = myAssignments.find((a) => a.task_id === i.id)
              return a?.status === 'completed' || i.status === 'completed'
            })
            const MAX_CHIPS = 3
            const allChips = [...events, ...incompleteTasks, ...completedTasks]
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
                  {visibleChips.map((item) => {
                    // employees 직접 조회 (JOIN 실패 방어)
                    const displayNames: string[] = canViewAll
                      ? (item.assignments?.length
                          ? item.assignments
                              .map((a) => employees.find((e) => e.id === a.assignee_id)?.full_name ?? null)
                              .filter((n): n is string => Boolean(n))
                          : (() => {
                              const name = employees.find((e) => e.id === item.created_by)?.full_name
                              return name ? [name] : []
                            })())
                      : []
                    const myA = myAssignments.find((a) => a.task_id === item.id)
                    const isDone = item.item_type !== 'event' && (myA?.status === 'completed' || item.status === 'completed')
                    return (
                      <div
                        key={item.id}
                        style={isDone ? { opacity: 0.35 } : undefined}
                        className={[
                          'text-[11px] px-1.5 py-0.5 rounded leading-tight flex items-center gap-1 overflow-hidden',
                          item.item_type === 'event'
                            ? 'bg-sky-100 text-sky-700'
                            : isDone
                              ? 'bg-gray-100 text-gray-400'
                              : item.status === 'overdue'
                                ? 'bg-red-100 text-red-700'
                                : item.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-indigo-100 text-indigo-700',
                        ].join(' ')}
                      >
                        <span className={`truncate flex-1 min-w-0 ${isDone ? 'line-through' : ''}`}>
                          {item.item_type === 'event' && item.start_time
                            ? `${item.start_time.slice(0, 5)} ${item.title}`
                            : item.title}
                        </span>
                        {displayNames.length > 0 && (
                          <span className="shrink-0 opacity-70 font-medium">
                            {displayNames[0]}
                            {displayNames.length > 1 ? ` 외 ${displayNames.length - 1}명` : ''}
                          </span>
                        )}
                      </div>
                    )
                  })}
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
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 inline-block" /> 진행중
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-100 inline-block" /> 일정
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-100 inline-block" /> 지연
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 inline-block opacity-50" /> 완료
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
          canViewAll={canViewAll}
          employees={employees}
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
