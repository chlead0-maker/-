'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import InviteEmployeeDialog from '@/components/employees/InviteEmployeeDialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserPlus, Loader2 } from 'lucide-react'
import type { Profile } from '@/lib/types'

export default function EmployeesPage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (me?.role !== 'admin') {
        window.location.href = '/dashboard'
        return
      }

      setIsAdmin(true)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name')

      setProfiles((data || []) as Profile[])
      setLoading(false)
    }
    load()
  }, [supabase])

  function handleInviteClose(open: boolean) {
    setInviteOpen(open)
    if (!open) {
      // 목록 새로고침
      supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name')
        .then(({ data }) => {
          if (data) setProfiles(data as Profile[])
        })
    }
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

      {/* 관리자 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">관리자 ({admins.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {admins.map((p) => (
              <ProfileRow key={p.id} profile={p} />
            ))}
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
              {employees.map((p) => (
                <ProfileRow key={p.id} profile={p} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InviteEmployeeDialog open={inviteOpen} onOpenChange={handleInviteClose} />
    </div>
  )
}

function ProfileRow({ profile }: { profile: Profile }) {
  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

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
        className={
          profile.role === 'admin'
            ? 'bg-indigo-100 text-indigo-700'
            : 'bg-gray-100 text-gray-600'
        }
      >
        {profile.role === 'admin' ? '관리자' : '직원'}
      </Badge>
    </div>
  )
}
