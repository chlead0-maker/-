import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EmployeesClient from '@/components/employees/EmployeesClient'
import type { Profile } from '@/lib/types'

export default async function EmployeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

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
