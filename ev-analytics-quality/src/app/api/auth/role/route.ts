import { NextResponse } from 'next/server';
import engine from '@/server/workspace/engine.js';
import { COOKIE, cookieOptions, getSession, signSession } from '@/server/auth';

export const runtime = 'nodejs';

// Administrators can view the platform as any role.
export async function POST(req: Request) {
  const s = await getSession();
  if (!s || !s.admin) return NextResponse.json({ error: 'Only an administrator can switch role.' }, { status: 403 });
  const { role } = await req.json().catch(() => ({}));
  if (!engine.roleList().some((r: any) => r.id === role)) return NextResponse.json({ error: 'Unknown role' }, { status: 400 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await signSession({ ...s, role }), cookieOptions);
  return res;
}
