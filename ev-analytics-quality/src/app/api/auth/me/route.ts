import { NextResponse } from 'next/server';
import engine from '@/server/workspace/engine.js';
import { getSession } from '@/server/auth';
import { USERS } from '@/server/users';
import { aiEnabled } from '@/server/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const roles = engine.roleList();
  const role = roles.find((r: any) => r.id === s.role);
  return NextResponse.json({
    user: { username: s.u, name: s.name, admin: s.admin },
    role,
    roles: s.admin ? roles.map((r: any) => ({ id: r.id, name: r.name })) : [],
    nav: engine.navFor(s.role),
    ai: aiEnabled(),
    accounts: s.admin || s.role === 'QLT' ? USERS.map((u) => ({ username: u.username, name: u.name, role: u.role, roleName: u.role === 'ADMIN' ? 'Administrator (can view as either profile)' : roles.find((r: any) => r.id === u.role)?.name })) : [],
  });
}
