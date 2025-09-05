import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip authentication for error pages
  if (pathname === '/auth/invalid-access' || 
      pathname === '/auth/pending' || 
      pathname === '/auth/guest-access') {
    return NextResponse.next()
  }
  
  // NextAuth JWT 토큰 검증
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  })
  
  // Redirect /temp-images/* to /api/images/* for backward compatibility
  if (pathname.startsWith('/temp-images/')) {
    const imagePath = pathname.replace('/temp-images/', '')
    return NextResponse.redirect(new URL(`/api/images/${imagePath}`, request.url))
  }


  // Allow public access to these paths
  const publicPaths = [
    '/',
    '/auth',
    '/auth/link-account',
    '/auth/invalid-access',
    '/auth/pending',
    '/auth/guest-access',
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
  

  // Check if this is an API route
  const isApiRoute = pathname.startsWith('/api/')
  
  // If no token and trying to access protected route
  if (!token && !isPublicPath) {
    if (isApiRoute) {
      // For API routes, return JSON error
      return NextResponse.json({ 
        error: 'Authentication required',
        requiresAuth: true
      }, { status: 401 })
    } else {
      // For web routes, redirect to login
      return NextResponse.redirect(new URL('/auth', request.url))
    }
  }
  
  // Check user status for protected routes (chat, settings, etc.)
  const protectedRoutes = ['/chat', '/setting', '/book']
  const protectedApiRoutes = ['/api/chat', '/api/agents', '/api/profile']
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  const isProtectedApiRoute = protectedApiRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  if (token && (isProtectedRoute || isProtectedApiRoute)) {
    // Check for guest role first
    if (token.role === 'guest') {
      if (isApiRoute) {
        return NextResponse.json({ 
          error: 'Guest access not allowed',
          requiresUpgrade: true
        }, { status: 403 })
      } else {
        return NextResponse.redirect(new URL('/auth/guest-access', request.url))
      }
    }
    
    // Check for pending status
    if (token.status === 'pending') {
      if (isApiRoute) {
        return NextResponse.json({ 
          error: 'Account pending approval',
          status: 'pending'
        }, { status: 403 })
      } else {
        return NextResponse.redirect(new URL('/auth/pending', request.url))
      }
    }
    
    // Check for inactive status
    if (token.status && token.status !== 'active') {
      if (isApiRoute) {
        return NextResponse.json({ 
          error: 'Account is not active',
          status: token.status
        }, { status: 403 })
      } else {
        return NextResponse.redirect(new URL('/auth/invalid-access', request.url))
      }
    }
  }

  // Admin paths protection
  const adminPaths = ['/admin', '/api/admin']
  const isAdminPath = adminPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  )

  if (isAdminPath && (!token || token.role !== 'admin')) {
    if (isApiRoute) {
      // For API routes, return JSON error
      return NextResponse.json({ 
        error: 'Admin access required',
        requiresAdmin: true
      }, { status: 403 })
    } else {
      // For web routes, redirect to home
      return NextResponse.redirect(new URL('/', request.url))
    }
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