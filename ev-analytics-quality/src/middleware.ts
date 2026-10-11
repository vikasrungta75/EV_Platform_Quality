import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-only-secret-change-me-before-you-deploy');

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) return NextResponse.next();
  const token = req.cookies.get('ev_session')?.value;
  let ok = false;
  if (token) {
    try {
      await jwtVerify(token, secret());
      ok = true;
    } catch {}
  }
  if (ok) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.svg|ravity-logo.svg).*)'] };
