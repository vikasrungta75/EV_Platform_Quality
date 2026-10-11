import { NextResponse } from 'next/server';
import engine from '@/server/workspace/engine.js';
import { getSession } from '@/server/auth';
import { askClaude, ruleAnalysis } from '@/server/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { title = '', sub = '', facts = [], data = '', scope = 'chart' } = await req.json().catch(() => ({}));
  const role = engine.roleList().find((r: any) => r.id === s.role);
  const fallback = ruleAnalysis(String(title), String(sub), (facts as string[]).map(String));
  const system = `You analyse one ${scope === 'page' ? 'dashboard page' : 'chart or table'} inside EV_Analytics_Quality, a quality analytics product for an electric-vehicle maker. All data is synthetic demo data. The reader is: ${role?.name}. They must not be shown: ${(role?.notSee || []).join('; ') || 'nothing is restricted'}.
Use only the facts and data given. Do not invent numbers. Reply with JSON only, no markdown, in this shape:
{"shows":"one sentence on what this shows","observations":["2 to 4 specific observations with numbers"],"drivers":["1 to 3 likely drivers"],"actions":["1 to 3 next steps for a quality engineer"],"caveats":["1 or 2 limits of this reading"]}`;
  const text = await askClaude(system, [{ role: 'user', content: `Title: ${title}\nDescription: ${sub}\nComputed facts:\n${(facts as string[]).join('\n')}\nData (trimmed):\n${String(data).slice(0, 6000)}` }], 800);
  if (text) {
    try {
      const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      if (j && j.shows) return NextResponse.json({ source: 'ai', ...j });
    } catch {}
  }
  return NextResponse.json(fallback);
}
