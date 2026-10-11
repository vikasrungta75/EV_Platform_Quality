// Named-query endpoint: GET /api/rest-proxy/<endpoint>?param=value. The role check happens on the server, inside the engine.
import { NextRequest, NextResponse } from 'next/server';
import engine from '@/server/workspace/engine.js';
import { getSession } from '@/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { endpoint: string } }) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const p: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => (p[k] = v));
  const out = engine.query(params.endpoint, p, s.role);
  if (out.error) return NextResponse.json({ endpoint: params.endpoint, error: out.error }, { status: out.status || 500 });
  return NextResponse.json({ endpoint: params.endpoint, params: p, records: out.data });
}
