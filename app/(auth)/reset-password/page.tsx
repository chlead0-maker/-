'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckSquare, Loader2, CheckCircle } from 'lucide-react'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('유효하지 않은 링크입니다.')
      setExchanging(false)
      return
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError('링크가 만료됐습니다. 비밀번호 찾기를 다시 시도해주세요.')
      setExchanging(false)
    })
  }, [searchParams, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다')
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md px-4">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">팀 캘린더</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>새 비밀번호 설정</CardTitle>
            <CardDescription>사용할 새 비밀번호를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center py-4">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">비밀번호가 변경됐습니다.</p>
                <p className="text-xs text-gray-400">잠시 후 로그인 페이지로 이동합니다...</p>
              </div>
            ) : exchanging ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : error && !password ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <Link href="/login" className="text-indigo-600 text-sm font-medium hover:underline">
                  로그인 페이지로 →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">새 비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="6자 이상"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">비밀번호 확인</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="비밀번호 재입력"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  비밀번호 변경
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
