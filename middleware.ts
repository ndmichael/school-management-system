import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    const { name, value, ...options } = cookie
    to.cookies.set(name, value, options)
  }
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and key')
  }

  // Supabase SSR proxy response (refreshes cookies when needed)
  const supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Keep server + browser in sync
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value)
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 1) Block unauthenticated users from /dashboard
  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)

    const redirectRes = NextResponse.redirect(url)
    copyCookies(supabaseResponse, redirectRes)
    return redirectRes
  }

  // 2) Prevent logged-in users from seeing /login
  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('main_role')
      .eq('id', user.id)
      .single()

    const destination = isMainRole(profile?.main_role) ? roleToPath[profile.main_role] : '/dashboard'

    const url = request.nextUrl.clone()
    url.pathname = destination
    url.search = ''

    const redirectRes = NextResponse.redirect(url)
    copyCookies(supabaseResponse, redirectRes)
    return redirectRes
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all routes except Next internals/static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
