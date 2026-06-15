'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/lib/types'

export function useRealtimeTasks(initialTasks: Task[]) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const supabase = createClient()

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks((prev) => [payload.new as Task, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === payload.new.id ? { ...t, ...payload.new } : t
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'task_assignments' },
        async () => {
          // 할당 상태 변경 시 전체 tasks 재조회
          const { data } = await supabase
            .from('tasks')
            .select('*, assignments:task_assignments(*, assignee:profiles(*))')
            .order('created_at', { ascending: false })
          if (data) setTasks(data as Task[])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return tasks
}
