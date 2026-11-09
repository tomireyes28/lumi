import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Gate de navegación en el cliente/edge de Next.js.
 * Nota de arquitectura: Este middleware actúa como barrera de redirección UX comprobando
 * formato estructural, vigencia temporal (exp) y presencia de sujeto (sub).
 * La autorización real y verificación criptográfica de firma + revocación (jti) la aplica
 * obligatoriamente la API de NestJS (JwtStrategy) en cada operación de datos.
 */
function hasUnexpiredTokenStructure(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    if (!payload || typeof payload.sub !== 'string' || !payload.sub) {
      return false;
    }
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000 > Date.now();
    }
    return false;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('lumi_session')?.value;
  const hasValidToken = hasUnexpiredTokenStructure(token);
  const { pathname } = request.nextUrl;

  // 1. Redirigir a login si intenta navegar a /dashboard sin sesión activa en el navegador
  if (pathname.startsWith('/dashboard')) {
    if (!hasValidToken) {
      const loginUrl = new URL('/', request.url);
      const response = NextResponse.redirect(loginUrl);
      if (token) {
        response.cookies.delete('lumi_session');
      }
      return response;
    }
  }

  // 2. Si ya posee token vigente, redirigir desde la portada ('/') al dashboard
  if (pathname === '/') {
    if (hasValidToken) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    if (token && !hasValidToken) {
      const response = NextResponse.next();
      response.cookies.delete('lumi_session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
