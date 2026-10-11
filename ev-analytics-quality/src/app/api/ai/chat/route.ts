import { NextResponse } from 'next/server';
import engine from '@/server/workspace/engine.js';
import { getSession } from '@/server/auth';
import { askClaude } from '@/server/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { q = '', history = [], extra = '' } = await req.json().catch(() => ({}));
  const msgs = (history as any[]).slice(-8).flatMap((h) => [{ role: 'user' as const, content: String(h.q) }, { role: 'assistant' as const, content: String(h.a) }]);
  msgs.push({ role: 'user', content: String(q) });
  const text = await askClaude(engine.assistantContext(s.role) + (extra ? '\nCURRENT SCREEN DATA:\n' + String(extra).slice(0, 5000) : ''), msgs, 900);
  if (text) return NextResponse.json({ source: 'ai', text });
  return NextResponse.json({ source: 'rules', text: engine.assistantLocal(s.role, String(q)) });
}
