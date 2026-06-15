import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/supabase/cached'
import { createClient } from '@/lib/supabase/server'
import EmployeesClient from '@/components/employees/EmployeesClient'
import type { Profile } from '@/lib/types'

export default async function EmployeesPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (profile.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const [{ data: active }, { data: inactive }] = await Promise.all([
    supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
    supabase.from('profiles').select('*').eq('is_active', false).order('created_at'),
  ])

  return (
    <EmployeesClient
      initialActive={(active || []) as Profile[]}
      initialPending={(inactive || []) as Profile[]}
    />
  )
}
