// Local sign-in: accounts live in ./users.ts, sessions are signed cookies. Nothing here talks to the Ravity platform.
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const COOKIE = 'ev_session';
export type Session = { u: string; name: string; role: string; admin: boolean };

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-only-secret-change-me-before-you-deploy');

export async function signSession(s: Session) {
  return new SignJWT(s as any).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('12h').sign(secret());
}
export async function verifyToken(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { u: String(payload.u), name: String(payload.name), role: String(payload.role), admin: !!payload.admin };
  } catch {
    return null;
  }
}
export async function getSession(): Promise<Session | null> {
  return verifyToken(cookies().get(COOKIE)?.value);
}
export const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 };
