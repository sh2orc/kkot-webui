import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authenticateRequest, JWTPayload } from '@/lib/jwt-auth'

export async function middleware(request: NextRequest) {
  // MSA 호환 JWT 토큰 검증
  const user = await authenticateRequest(request)

  const pathname = request.nextUrl.pathname
  
  // Redirect /temp-images/* to /api/images/* for backward compatibility
  if (pathname.startsWith('/temp-images/')) {
    const imagePath = pathname.replace('/temp-images/', '')
    return NextResponse.redirect(new URL(`/api/images/${imagePath}`, request.url))
  }

  // Log detailed information
  console.log('[Middleware] Path:', pathname)
  console.log('[Middleware] Session Cookie:', request.cookies.has('next-auth.session-token') || request.cookies.has('__Secure-next-auth.session-token'))
  console.log('[Middleware] All Cookies:', request.cookies.getAll().map(c => c.name))
  
  // Log token value (safely)
  const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                      request.cookies.get('__Secure-next-auth.session-token')?.value
  console.log('[Middleware] Session Token Value:', sessionToken ? 'exists' : 'missing')
  
  console.log('[Middleware] JWT User verified:', !!user)
  if (user) {
    console.log('[Middleware] User info:', { email: user.email, role: user.role })
  }

  // Allow public access to these paths
  const publicPaths = [
    '/',
    '/auth',
    '/auth/link-account',
    '/api/auth',
    '/api/oauth-providers',
    '/_next',
    '/favicon.ico',
    '/images',
    '/placeholder-logo.svg',
    '/api/images'  // Allow public access to image API
  ]

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  )

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicPath) {
    console.log('[Middleware] Redirecting to /auth - No valid JWT user')
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Admin paths protection
  const adminPaths = ['/admin', '/api/admin']
  const isAdminPath = adminPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  )

  if (isAdminPath && (!user || user.role !== 'admin')) {
    console.log('[Middleware] Access denied to admin path - Role:', user?.role || 'none')
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints should always be accessible)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}