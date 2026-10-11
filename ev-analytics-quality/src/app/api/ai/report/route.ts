// Written narrative for the VIN failure report. With an AI key the narrative is written by Claude from the computed evidence; otherwise the computed verdict stands.
import { NextResponse } from 'next/server';
import engine from '@/server/workspace/engine.js';
import { getSession } from '@/server/auth';
import { askClaude } from '@/server/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { vin = '' } = await req.json().catch(() => ({}));
  const rep = engine.query('ev_q_vinreport', { vin: String(vin) }, s.role);
  if (rep.error) return NextResponse.json({ error: rep.error }, { status: rep.status || 400 });
  const d = rep.data;
  const brief = { identity: { ...d.identity, lots: undefined }, conclusion: d.conclusion, candidates: d.candidates, signatureMatch: d.sigMatch, deviations: d.deviations.slice(0, 14).map((r: any) => ({ name: r.name, value: r.x, healthy: r.good, z: r.zg, unit: r.unit })), codes: d.dtc.chain, sequence: d.dtc.seq, nextCode: d.dtc.next, predicted: d.predicted, cohort: d.cohort.rows, history: d.history, bulletins: d.bulletins, pastCases: d.pastCases, lookAlikes: d.lookAlikes.summary };
  const text = await askClaude(
    'You are a senior vehicle quality engineer writing the summary of a failure analysis for one electric vehicle. All data is synthetic demo data. Use only the evidence given; do not invent numbers, parts or documents. Write four short paragraphs in plain sentences, no headings and no bullet points: what is wrong and how sure you are; the evidence, strongest first; what else it could be and why that is less likely; what to do next and in what order.',
    [{ role: 'user', content: JSON.stringify(brief).slice(0, 14000) }],
    900,
  );
  return NextResponse.json(text ? { source: 'ai', text } : { source: 'rules' });
}
