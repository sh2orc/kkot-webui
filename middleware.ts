import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  // Check NextAuth session cookie
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
                      request.cookies.get('__Secure-next-auth.session-token')?.value;

  // If session token is missing
  if (!sessionToken) {
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