'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import {
  CheckSquare,
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Users,
  LogOut,
  Plus,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface SidebarProps {
  profile: Profile
}

const navItems = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/calendar', label: '캘린더', icon: Calendar },
  { href: '/tasks', label: '업무 목록', icon: ClipboardList },
  { href: '/reports', label: '보고서', icon: FileText },
]

const adminNavItems = [
  { href: '/employees', label: '직원 관리', icon: Users },
]

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = profile.role === 'admin'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-gray-200">
      {/* 로고 */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <CheckSquare className="h-6 w-6 text-indigo-600" />
        <span className="text-lg font-bold text-gray-900">팀 캘린더</span>
      </div>

      {/* 업무 추가 버튼 — 모든 역할에 표시 */}
      <div className="px-4 pt-4">
        <Link
          href="/tasks/new"
          className={cn(buttonVariants({ size: 'sm' }), 'w-full flex items-center justify-center gap-2')}
        >
          <Plus className="h-4 w-4" />
          {isAdmin ? '업무 생성' : '내 업무 추가'}
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-4 pt-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === href || (href !== '/tasks' && pathname.startsWith(href + '/'))
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-2 pb-1 px-3">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                관리자
              </span>
            </div>
            {adminNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === href
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* 사용자 정보 */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile.full_name}</p>
            <p className="text-xs text-gray-500">
              {profile.role === 'admin' ? '관리자' : '직원'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
