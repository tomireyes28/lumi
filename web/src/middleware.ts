import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isValidAndUnexpiredJwt(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000 > Date.now();
    }
    return Boolean(payload.sub);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('lumi_token')?.value;
  const hasValidToken = isValidAndUnexpiredJwt(token);
  const { pathname } = request.nextUrl;

  // 1. Proteger todas las rutas del dashboard
  if (pathname.startsWith('/dashboard')) {
    if (!hasValidToken) {
      const loginUrl = new URL('/', request.url);
      const response = NextResponse.redirect(loginUrl);
      if (token) {
        response.cookies.delete('lumi_token');
      }
      return response;
    }
  }

  // 2. Si ya está autenticado con un token vigente, redirigir desde la pantalla de login ('/') al dashboard
  if (pathname === '/') {
    if (hasValidToken) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    if (token && !hasValidToken) {
      const response = NextResponse.next();
      response.cookies.delete('lumi_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
  ],
};
