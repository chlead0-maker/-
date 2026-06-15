'use client'

import { useState } from 'react'
import { inviteEmployee } from '@/lib/actions/employees'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface InviteEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function InviteEmployeeDialog({ open, onOpenChange }: InviteEmployeeDialogProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await inviteEmployee(fullName, email)
      setSuccess(true)
      setFullName('')
      setEmail('')
      setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
      }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>직원 추가</DialogTitle>
          <DialogDescription>
            직원 계정을 생성합니다. 직원은 이메일과 비밀번호로 로그인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="py-4 text-center text-green-600 font-medium">
            직원 계정이 생성되었습니다!
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">이름 *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="홍길동"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empEmail">이메일 *</Label>
              <Input
                id="empEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="employee@company.com"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-xs text-gray-500">
              * 생성 후 직원에게 이메일과 초기 비밀번호를 별도로 알려주세요.
              Supabase Dashboard에서 직접 비밀번호를 설정할 수 있습니다.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                취소
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                계정 생성
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
