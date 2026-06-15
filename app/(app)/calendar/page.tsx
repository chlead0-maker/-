export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAuthUser, getProfile } from '@/lib/supabase/cached'
import { createClient } from '@/lib/supabase/server'
import CalendarView from '@/components/calendar/CalendarView'

export default async function CalendarPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user || !profile) redirect('/login')

  const isAdmin = profile.role === 'admin'
  const canViewAll = profile.role === 'admin' || profile.role === 'team_lead'

  let employees: { id: string; full_name: string }[] = []
  if (canViewAll) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name')
    employees = data || []
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">캘린더</h1>
        <p className="text-sm text-gray-500 mt-0.5">할일과 일정을 날짜별로 확인하세요</p>
      </div>
      <CalendarView
        canViewAll={canViewAll}
        isAdmin={isAdmin}
        currentUserId={user.id}
        employees={employees}
      />
    </div>
  )
}
