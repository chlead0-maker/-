'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { approveEmployee, rejectEmployee } from '@/lib/actions/employees'
import InviteEmployeeDialog from '@/components/employees/InviteEmployeeDialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Loader2, Check, X, Clock } from 'lucide-react'
import type { Profile } from '@/lib/types'

export default function EmployeesPage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [pending, setPending] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') { window.location.href = '/dashboard'; return }

    const [{ data: active }, { data: inactive }] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
      supabase.from('profiles').select('*').eq('is_active', false).order('created_at'),
    ])

    setProfiles((active || []) as Profile[])
    setPending((inactive || []) as Profile[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleInviteClose(open: boolean) {
    setInviteOpen(open)
    if (!open) load()
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      await approveEmployee(id)
      await load()
    })
  }

  function handleReject(id: string) {
    if (!confirm('이 가입 신청을 거절하시겠습니까?')) return
    startTransition(async () => {
      await rejectEmployee(id)
      await load()
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const employees = profiles.filter((p) => p.role === 'employee')
  const admins = profiles.filter((p) => p.role === 'admin')

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">직원 관리</h1>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          직원 추가
        </Button>
      </div>

      {/* 승인 대기 */}
      {pending.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
              <Clock className="h-4 w-4" />
              승인 대기 ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-yellow-100 last:border-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-yellow-100 text-yellow-700 text-sm font-medium">
                      {p.full_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{p.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => handleApprove(p.id)}
                      disabled={isPending}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleReject(p.id)}
                      disabled={isPending}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      거절
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 관리자 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">관리자 ({admins.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {admins.map((p) => <ProfileRow key={p.id} profile={p} />)}
          </div>
        </CardContent>
      </Card>

      {/* 직원 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">직원 ({employees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400 mb-4">등록된 직원이 없습니다</p>
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                첫 직원 추가
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((p) => <ProfileRow key={p.id} profile={p} />)}
            </div>
          )}
        </CardContent>
      </Card>

      <InviteEmployeeDialog open={inviteOpen} onOpenChange={handleInviteClose} />
    </div>
  )
}

function ProfileRow({ profile }: { profile: Profile }) {
  const initials = profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
        <p className="text-xs text-gray-500 truncate">{profile.email}</p>
      </div>
      <Badge
        variant="secondary"
        className={profile.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}
      >
        {profile.role === 'admin' ? '관리자' : '직원'}
      </Badge>
    </div>
  )
}
