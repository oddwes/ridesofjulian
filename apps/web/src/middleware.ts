import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth')
  const isLoginRoute = req.nextUrl.pathname === '/login'

  if (!session && !isAuthRoute && !isLoginRoute) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  return response
}

export const config = {
  matcher: [
    // Apply middleware to all routes except Next static assets, auth callback,
    // the Strava logo, and API routes (e.g. /api/generate-plan)
    '/((?!api|_next/static|_next/image|favicon.ico|auth/callback|strava-logo.svg).*)',
  ],
}


