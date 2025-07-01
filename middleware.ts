import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip static file requests
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/static') ||
      pathname.includes('.') ||
      pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Paths that don't require authentication
  const publicPaths = ['/auth'];
  
  // Proceed with paths that don't require authentication
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 임시로 세션 쿠키 확인 방식으로 변경
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                      request.cookies.get('__Secure-next-auth.session-token')?.value;

  // 디버깅 로그
  console.log(`Middleware - Path: ${pathname}`);
  console.log(`Middleware - Session Cookie:`, !!sessionToken);

  // Get JWT token for detailed info (if session cookie exists)
  let token = null;
  if (sessionToken) {
    try {
      token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      });
      console.log(`Middleware - JWT Token:`, !!token);
    } catch (error) {
      console.log(`Middleware - JWT Error:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // If no session cookie (not authenticated)
  if (!sessionToken) {
    console.log(`Middleware - No session cookie, redirecting to /auth`);
    // Return JSON error response for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Redirect to auth page for regular pages
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Check admin access for /admin paths
  if (pathname.startsWith('/admin')) {
    if (!token || token.role !== 'admin') {
      // Return JSON error response for API routes
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Admin access required' },
          { status: 403 }
        );
      }
      
      // Redirect to main page for regular pages
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

// Configure paths where middleware should be applied
export const config = {
  matcher: [
    // Apply middleware to specific API routes (exclude auth API)
    '/api/agents/:path*',
    '/api/admin-settings/:path*',
    '/api/chat/:path*',
    '/api/db-test/:path*',
    '/api/llm-models/:path*',
    '/api/llm-servers/:path*',
    '/api/llm-test/:path*',
    '/api/profile/:path*',
    // Apply middleware to protected pages
    '/admin/:path*',
    '/chat/:path*',
    '/book/:path*',  
    '/setting/:path*',
    // Apply to root page
    '/',
  ],
}; 