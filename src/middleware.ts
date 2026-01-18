import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Protected API routes that require authentication
  const protectedRoutes = ['/api/scrape', '/api/analyze']

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute) {
    const authHeader = request.headers.get('authorization')
    const isVercelCron = request.headers.get('x-vercel-cron') === '1'

    // Allow Vercel cron jobs
    if (isVercelCron) {
      return NextResponse.next()
    }

    // Check for CRON_SECRET in authorization header
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.next()
    }

    // Check for secret in query parameter (for browser testing)
    const querySecret = request.nextUrl.searchParams.get('secret')
    if (querySecret === process.env.CRON_SECRET) {
      return NextResponse.next()
    }

    // In development, allow unauthenticated access for testing
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next()
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
