'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export type LoginResult = {
  success: boolean
  error: string
}

const roleToPath = {
  admin: '/dashboard/admin',
  student: '/dashboard/student',
  academic_staff: '/dashboard/academic_staff',
  non_academic_staff: '/dashboard/non_academic_staff',
} as const

export async function loginAction(
  _prevState: LoginResult,
  formData: FormData
): Promise<LoginResult> {
  const supabase = await createClient()

  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { success: false, error: 'Invalid email or password.' }
  }

  const { email, password } = parsed.data

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return { success: false, error: 'Invalid credentials.' }
  }

  // --------------------------
  // 🔥 DEBUG STEP 1 — log user session
  // --------------------------
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('🔍 LOGIN DEBUG → USER ID:', user?.id)
  console.log('🔍 LOGIN DEBUG → USER OBJECT:', user)

  if (!user) {
    return { success: false, error: 'Authentication failed.' }
  }

  // --------------------------
  // 🔥 DEBUG STEP 2 — log profile fetch
  // --------------------------
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('main_role')
    .eq('id', user.id)
    .single()

  console.log('🔍 LOGIN DEBUG → PROFILE:', profile)
  console.log('🔍 LOGIN DEBUG → PROFILE ERROR:', profileError)

  if (profileError || !profile?.main_role) {
    return { success: false, error: 'User role not found.' }
  }

  const role = profile.main_role as keyof typeof roleToPath
  const redirectPath = roleToPath[role]

  console.log('🔍 LOGIN DEBUG → ROLE:', role)
  console.log('🔍 LOGIN DEBUG → REDIRECTING TO:', redirectPath)

  redirect(redirectPath)
}
