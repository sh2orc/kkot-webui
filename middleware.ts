import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware
export async function middleware(request: NextRequest) {
  // Skip middleware for static file requests
  if (request.nextUrl.pathname.startsWith('/_next') || 
      request.nextUrl.pathname.startsWith('/static') ||
      request.nextUrl.pathname.includes('.')) {
    return NextResponse.next();
  }

  // You can add other middleware logic here as needed
  // Example: authentication checks, redirects, etc.
  
  return NextResponse.next();
}

// Configure paths where middleware should be applied
export const config = {
  matcher: [
    // Apply middleware to all API routes
    '/api/:path*',
    // Apply middleware to admin pages
    '/admin/:path*',
    // Apply middleware to chat pages
    '/chat/:path*',
    // Exclude static files
    '/((?!_next/|public/|favicon.ico).*)',
  ],
}; 