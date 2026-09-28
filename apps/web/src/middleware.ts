import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || "development_super_secret_key_change_me_in_production";
  return new TextEncoder().encode(secret);
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define public routes
  const isPublicRoute = path === '/' || path === '/login' || path === '/register';
  
  // Exclude internal API routes (secured by API key) and static files
  if (path.startsWith('/api/internal') || path.startsWith('/_next') || path.includes('.')) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('auth_session')?.value;
  let isValidSession = false;

  if (cookie) {
    try {
      await jwtVerify(cookie, getJwtSecret());
      isValidSession = true;
    } catch (err) {
      // Invalid or expired token
      isValidSession = false;
    }
  }

  if (!isPublicRoute && !isValidSession) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  if ((path === '/login' || path === '/register') && isValidSession) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/internal|_next/static|_next/image|favicon.ico).*)'],
};
