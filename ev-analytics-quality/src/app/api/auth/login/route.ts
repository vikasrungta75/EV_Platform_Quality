import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { USERS } from '@/server/users';
import { COOKIE, cookieOptions, signSession } from '@/server/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const user = USERS.find((u) => u.username === String(username || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(String(password || ''), user.hash)) {
    return NextResponse.json({ error: 'Username or password is not correct.' }, { status: 401 });
  }
  const admin = user.role === 'ADMIN';
  const token = await signSession({ u: user.username, name: user.name, role: admin ? 'QLT' : user.role, admin });
  const res = NextResponse.json({ ok: true, role: admin ? 'QLT' : user.role, admin });
  res.cookies.set(COOKIE, token, cookieOptions);
  return res;
}
