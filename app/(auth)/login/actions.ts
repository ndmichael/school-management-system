'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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

type MainRole = keyof typeof roleToPath

function authErrorToMessage(message?: string) {
  const msg = (message || '').toLowerCase()

  // Supabase can return different messages depending on configuration
  if (msg.includes('invalid login credentials')) return 'Invalid email or password.'
  if (msg.includes('email not confirmed')) return 'Please confirm your email before signing in.'
  if (msg.includes('too many requests')) return 'Too many attempts. Please try again later.'
  return 'Unable to sign in. Please try again.'
}

export async function loginAction(
  _prevState: LoginResult,
  formData: FormData
): Promise<LoginResult> {
  const supabase = await createClient()

  // ✅ Parse + coerce to strings (FormDataEntryValue can be File | string)
  const parsed = LoginSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  })

  if (!parsed.success) {
    return { success: false, error: 'Invalid email or password.' }
  }

  const { email, password } = parsed.data

  // ✅ Prefer the returned data.user to avoid an extra request + timing issues
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError) {
    return { success: false, error: authErrorToMessage(signInError.message) }
  }

  const user = data.user
  if (!user) {
    return { success: false, error: 'Authentication failed.' }
  }

  // ✅ Fetch role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('main_role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.main_role) {
    return { success: false, error: 'User role not found.' }
  }

  // ✅ Guard against unknown roles
  const role = profile.main_role as string
  if (!(role in roleToPath)) {
    return { success: false, error: 'User role not supported.' }
  }

  const redirectPath = roleToPath[role as MainRole]
  redirect(redirectPath)
}
