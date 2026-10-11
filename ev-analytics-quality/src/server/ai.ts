// Optional AI layer. With ANTHROPIC_API_KEY set, analysis, Sage answers, the written failure report and live web research are produced by Claude.
// Without it, callers fall back to rule-based text and the web research section says it is switched off.
export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

async function call(body: any): Promise<any | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL(), ...body }),
    });
    if (!res.ok) return { error: `The AI service returned ${res.status}.` };
    return await res.json();
  } catch (e: any) {
    return { error: 'The AI service could not be reached.' };
  }
}

export async function askClaude(system: string, messages: { role: 'user' | 'assistant'; content: string }[], maxTokens = 700): Promise<string | null> {
  const j = await call({ max_tokens: maxTokens, system, messages });
  if (!j || j.error) return null;
  const text = (j.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim();
  return text || null;
}

// Live web research using the web search tool. Returns the written answer and the pages it cited.
export async function searchWeb(system: string, prompt: string, maxUses = 4): Promise<{ text: string; sources: { title: string; url: string }[] } | { error: string } | null> {
  const j = await call({ max_tokens: 1400, system, messages: [{ role: 'user', content: prompt }], tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxUses }] });
  if (!j) return null;
  if (j.error) return { error: j.error };
  const sources = new Map<string, string>();
  let text = '';
  for (const b of j.content || []) {
    if (b.type === 'text') {
      text += b.text;
      for (const c of b.citations || []) if (c.url) sources.set(c.url, c.title || c.url);
    } else if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content) if (r.url && !sources.has(r.url) && sources.size < 12) sources.set(r.url, r.title || r.url);
    }
  }
  return { text: text.trim(), sources: [...sources.entries()].map(([url, title]) => ({ url, title })) };
}

// Rule-based analysis used when no AI key is configured, or when the AI call fails.
const HINTS: [RegExp, string, string][] = [
  [/recall|risk.rank|priority|wave/i, 'Failure probability, time to failure, safety severity and how hard the vehicle is used set the order.', 'Reach the "now" and "within 30 days" bands first and confirm parts and workshop capacity for them.'],
  [/predict|forecast|expected|probab/i, 'Health-indicator drift and the fault-code sequence carry most of the signal; cohort membership sets the baseline.', 'Check the highest-risk vehicles in a workshop to confirm the estimate before acting on the whole list.'],
  [/supplier|lot|recover/i, 'A few lots from one supplier usually carry a failure pattern; the rest of that supplier\'s parts behave normally.', 'Hold remaining stock from the lot, ask for a teardown report and attach lot evidence to the recovery claim.'],
  [/plant|line|shift|station|end-of-line|press|seating/i, 'A tooling change, a fixture out of service or a missed check on one shift are the usual causes.', 'Audit the station for the build window and compare station measurements of failed and healthy vehicles.'],
  [/no-fault|repeat|nff/i, 'The symptom points at one part while the cause sits in another component or in software.', 'Issue a service note naming the indicator to check before the part is replaced.'],
  [/warranty|claim|cost|dealer|reserve/i, 'A small number of issues and build cohorts usually carry most of the cost.', 'Rank by cost and by months in service, then act on the issues with the largest 90-day exposure.'],
  [/code|dtc|fault|sequence/i, 'Fault code counts move with software version, build cohort and how many vehicles are in service.', 'Read the sequence: the first code in a known chain gives weeks of warning before the claim.'],
  [/drift|indicator|signal|deviation|kpi|compare/i, 'A component wearing out, a software change, or simply different usage and climate can move an indicator.', 'Compare against vehicles with the same usage and climate; if the gap remains, inspect the component named by the indicator.'],
  [/launch|months in service|mis/i, 'Launch software, new suppliers and new stations are the usual sources in the first months.', 'Review weekly until the three-month rate is at target and fix issues while volume is low.'],
  [/alert|agent|finding/i, 'Several independent signals on the same model and component usually share one cause.', 'Work from the finding, not the single alerts, and approve the proposed actions that are cheap to reverse first.'],
];
export function ruleAnalysis(title: string, sub: string, facts: string[]) {
  const hit = HINTS.find((h) => h[0].test(title + ' ' + sub)) || [null, 'The pattern depends on which vehicles, period and conditions are included.', 'Narrow the selection with filters and compare it against a healthy baseline.'];
  return {
    source: 'rules',
    shows: sub ? `${title}. ${sub}` : title,
    observations: facts.length ? facts.slice(0, 6) : ['There is nothing measurable in this panel yet.'],
    drivers: [hit[1] as string],
    actions: [hit[2] as string],
    caveats: ['Demo data: values are generated, not measured.', 'A difference between groups is not proof of cause; check that the groups are alike in model, age and climate.'],
  };
}
