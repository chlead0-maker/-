'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { AppNotification } from '@/lib/types'

interface Props {
  userId: string
}

export default function NotificationBell({ userId }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (!error) setNotifications((data || []) as AppNotification[])
    } catch {
      // notifications 테이블 미생성 시 무시
    } finally {
      setReady(true)
    }
  }, [supabase, userId])

  useEffect(() => {
    fetchNotifications()

    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel(`notif:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => {
            const n = payload.new as AppNotification
            setNotifications((prev) => [n, ...prev])
            toast(n.title, {
              description: n.message ?? undefined,
              ...(n.task_id
                ? { action: { label: '보기', onClick: () => { window.location.href = `/tasks/${n.task_id}` } } }
                : {}),
            })
          }
        )
        .subscribe()
    } catch {
      // 구독 실패 시 무시 (테이블 미생성 등)
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchNotifications, supabase, userId])

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (!unreadIds.length) return
    try {
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // 무시
    }
  }

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next && unreadCount > 0) markAllRead()
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-md"
        title="알림"
      >
        <Bell className="h-4 w-4" />
        {ready && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-full ml-2 bottom-0 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">알림</p>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  모두 읽음
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">알림이 없습니다</p>
              ) : (
                notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.task_id ? `/tasks/${n.task_id}` : '#'}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-indigo-50/50' : ''}`}
                  >
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900">{n.title}</p>
                      {n.message && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {format(parseISO(n.created_at), 'M월 d일 HH:mm', { locale: ko })}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
