// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // or PUBLISHABLE_KEY if you renamed
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Next.js 14: use the object overload, no `any`, no tuple error
              cookieStore.set({
                name,
                value,
                ...options,
              })
            })
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Safe to ignore IF you later add middleware/proxy to refresh sessions.
          }
        },
      },
    }
  )
}
