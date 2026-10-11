// Live web research for the VIN failure report. Needs ANTHROPIC_API_KEY; the model searches the public web and cites what it read.
// Only the component, fault code and failure mode are sent. The VIN, customer, supplier names and internal figures never leave the deployment.
import { NextResponse } from 'next/server';
import engine from '@/server/workspace/engine.js';
import { getSession } from '@/server/auth';
import { aiEnabled, searchWeb } from '@/server/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { vin = '' } = await req.json().catch(() => ({}));
  const rep = engine.query('ev_q_vinreport', { vin: String(vin) }, s.role);
  if (rep.error) return NextResponse.json({ error: rep.error }, { status: rep.status || 400 });
  const w = rep.data.web;
  if (!aiEnabled()) return NextResponse.json({ source: 'off', queries: w.queries });
  const out: any = await searchWeb(
    'You are a vehicle quality engineer researching a field failure on an electric vehicle. Search the public web and report only what the pages say. Prefer regulator recall records, manufacturer service bulletins, standards bodies and peer-reviewed work over forums. Never invent a recall or a bulletin. If you find nothing relevant, say so. Write plain sentences, no markdown headings.',
    `Component: ${w.component}\nFault code: ${w.code || 'none'}\nFailure mode seen in telemetry: ${w.mode || 'not characterised'}\n\nFind and summarise in under 250 words: (1) publicly reported recalls or investigations for this failure mode on electric vehicles; (2) known causes reported for this failure mode; (3) recommended checks or remedies. End with one line on how confident the public evidence is.`,
  );
  if (!out) return NextResponse.json({ source: 'off', queries: w.queries });
  if (out.error) return NextResponse.json({ source: 'error', error: out.error, queries: w.queries });
  return NextResponse.json({ source: 'web', text: out.text, sources: out.sources, queries: w.queries });
}
