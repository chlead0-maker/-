'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  approveEmployee, rejectEmployee, deleteEmployee, resetEmployeePassword,
} from '@/lib/actions/employees'
import InviteEmployeeDialog from '@/components/employees/InviteEmployeeDialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { UserPlus, Check, X, Clock, KeyRound, Trash2, Loader2 } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface EmployeesClientProps {
  initialActive: Profile[]
  initialPending: Profile[]
}

export default function EmployeesClient({ initialActive, initialPending }: EmployeesClientProps) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [resetTarget, setResetTarget] = useState<Profile | null>(null)
  const [resetDone, setResetDone] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  function handleApprove(id: string) {
    startTransition(async () => {
      await approveEmployee(id)
      router.refresh()
    })
  }

  function handleReject(id: string) {
    if (!confirm('이 가입 신청을 거절하시겠습니까?')) return
    startTransition(async () => {
      await rejectEmployee(id)
      router.refresh()
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      await deleteEmployee(deleteTarget.id)
      setDeleteTarget(null)
      router.refresh()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleResetPassword() {
    if (!resetTarget) return
    setActionLoading(true)
    try {
      await resetEmployeePassword(resetTarget.email)
      setResetDone(true)
    } finally {
      setActionLoading(false)
    }
  }

  function handleInviteClose(open: boolean) {
    setInviteOpen(open)
    if (!open) router.refresh()
  }

  const employees = initialActive.filter((p) => p.role === 'employee')
  const admins = initialActive.filter((p) => p.role === 'admin')

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">직원 관리</h1>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          직원 추가
        </Button>
      </div>

      {initialPending.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
              <Clock className="h-4 w-4" />
              승인 대기 ({initialPending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {initialPending.map((p) => (
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
                    <Button size="sm" variant="outline"
                      className="h-8 px-3 text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => handleApprove(p.id)} disabled={isPending}>
                      <Check className="h-3.5 w-3.5 mr-1" />승인
                    </Button>
                    <Button size="sm" variant="outline"
                      className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleReject(p.id)} disabled={isPending}>
                      <X className="h-3.5 w-3.5 mr-1" />거절
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">직원 ({employees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400 mb-4">등록된 직원이 없습니다</p>
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />첫 직원 추가
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {employees.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
                      {p.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{p.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">직원</Badge>
                    <Button size="sm" variant="ghost"
                      className="h-7 px-2 text-gray-500 hover:text-indigo-600"
                      title="비밀번호 재설정 이메일 발송"
                      onClick={() => { setResetTarget(p); setResetDone(false) }}>
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 px-2 text-gray-500 hover:text-red-600"
                      title="계정 삭제"
                      onClick={() => setDeleteTarget(p)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InviteEmployeeDialog open={inviteOpen} onOpenChange={handleInviteClose} />

      {/* 비밀번호 재설정 다이얼로그 */}
      <Dialog open={!!resetTarget} onOpenChange={(v) => { if (!v) { setResetTarget(null); setResetDone(false) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 재설정</DialogTitle>
            <DialogDescription>
              {resetDone
                ? `${resetTarget?.email}로 비밀번호 재설정 링크를 발송했습니다.`
                : `${resetTarget?.full_name}(${resetTarget?.email})에게 비밀번호 재설정 이메일을 발송합니다.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {resetDone ? (
              <Button onClick={() => { setResetTarget(null); setResetDone(false) }}>확인</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setResetTarget(null)}>취소</Button>
                <Button onClick={handleResetPassword} disabled={actionLoading}>
                  {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  이메일 발송
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 계정 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>계정 삭제</DialogTitle>
            <DialogDescription>
              <span className="font-medium">{deleteTarget?.full_name}</span>의 계정을 삭제하면
              해당 직원의 업무 할당 내역도 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={actionLoading}>취소</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">관리자</Badge>
    </div>
  )
}
