export const dynamic = 'force-dynamic'
export const preferredRegion = 'icn1'

import { redirect } from 'next/navigation'
import { getAuthUser, getProfile } from '@/lib/supabase/cached'
import Sidebar from '@/components/layout/Sidebar'
import PendingApproval from '@/components/layout/PendingApproval'
import type { Profile } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])

  if (!user || !profile) redirect('/login')

  if (!profile.is_active) {
    return <PendingApproval />
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar profile={profile as Profile} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
