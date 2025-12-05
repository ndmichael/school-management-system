'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const UpdateAdminProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
})

export type UpdateAdminState = {
  success: boolean
  error: string
}

export async function updateAdminProfileAction(
  _prevState: UpdateAdminState,
  formData: FormData
): Promise<UpdateAdminState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated.' }
  }

  const parsed = UpdateAdminProfileSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    phone: formData.get('phone') || undefined,
    avatarUrl: formData.get('avatarUrl') || undefined,
  })

  if (!parsed.success) {
    return { success: false, error: 'Invalid input data.' }
  }

  const { firstName, lastName, phone, avatarUrl } = parsed.data

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      avatar_url: avatarUrl,
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating admin profile:', error)
    return { success: false, error: 'Failed to update admin profile.' }
  }

  return { success: true, error: '' }
}
