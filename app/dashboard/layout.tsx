import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard'
import type { DashboardUser, UserRole } from '@/types/dashboard'

type Props = {
  children: ReactNode
}

export default async function DashboardLayout({ children }: Props) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'first_name, middle_name, last_name, email, main_role'
    )
    .eq('id', user.id)
    .single()

  if (error || !profile?.main_role) {
    redirect('/login')
  }

  const role = profile.main_role as UserRole

  const fullName = [profile.first_name, profile.middle_name, profile.last_name]
    .filter(Boolean)
    .join(' ')

  const dashboardUser: DashboardUser = {
    id: user.id,
    fullName: fullName || 'User',
    email: profile.email,
    role,
  }

  return (
    <DashboardShell user={dashboardUser}>
      {children}
    </DashboardShell>
  )
}
