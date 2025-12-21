import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginClient from './LoginClient'

export const dynamic = 'force-dynamic'

const roleToPath = {
  admin: '/dashboard/admin',
  student: '/dashboard/student',
  academic_staff: '/dashboard/academic_staff',
  non_academic_staff: '/dashboard/non_academic_staff',
} as const

type MainRole = keyof typeof roleToPath

function isMainRole(value: unknown): value is MainRole {
  return typeof value === 'string' && value in roleToPath
}

export default async function LoginPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If already logged in, redirect before rendering the client form
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('main_role')
      .eq('id', user.id)
      .single()

    if (isMainRole(profile?.main_role)) {
      redirect(roleToPath[profile.main_role])
    }

    redirect('/dashboard')
  }

  return <LoginClient />
}
