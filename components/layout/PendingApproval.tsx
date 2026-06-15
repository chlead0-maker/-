'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckSquare, Clock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PendingApproval() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-4">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-gray-900">팀 업무 관리</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-yellow-50 flex items-center justify-center">
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">승인 대기 중</h2>
          <p className="text-sm text-gray-500 mb-6">
            관리자가 가입을 승인하면<br />이용할 수 있습니다.
          </p>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  )
}
