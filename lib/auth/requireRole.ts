import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/dashboard'

export async function requireRole(requiredRole: UserRole): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('main_role')
    .eq('id', user.id)
    .single()

  if (error || profile?.main_role !== requiredRole) {
    // Logged in but wrong role → send them to their own dashboard root
    redirect('/dashboard')
  }
}
