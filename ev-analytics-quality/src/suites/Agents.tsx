'use client';
// AI agents: what each agent watches, what it found, the evidence, and the actions it proposes. A person approves every action.
import { useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Chart from '@/components/Chart';
import Panel from '@/components/Panel';
import { ErrorBox, Kpis, Loading, Sev, Sparkline, Tabs, fmt, inr } from '@/components/ui';
import { chart as C } from '@/lib/charts';
import { useLocal } from '@/lib/hooks';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';

export const FactorList = ({ factors, max = 6 }: { factors: any[]; max?: number }) => {
  const top = Math.max(1, ...factors.map((f) => f.z));
  return (
    <div>
      {factors.length === 0 && <div className="small muted">No factor separates failed from healthy vehicles.</div>}
      {factors.slice(0, max).map((f, i) => (
        <div className="factor" key={i}>
          <span><b>{f.dim}</b> = {f.val}<div className="small muted">{f.rate}% failed with it, {f.rest}% without · {f.cover}% of all failures</div></span>
          <span className="fbar" title={'Strength ' + f.z}><i style={{ width: (f.z / top) * 100 + '%' }} /></span>
          <span className="mono small">{f.rr}x</span>
        </div>
      ))}
    </div>
  );
};

export default function Agents() {
  const { go, toast } = useApp();
  const [agent, setAgent] = useState('');
  const [done, setDone] = useLocal<Record<string, string>>('evq_actions', {});
  const q = useQuery(() => ds.fetchAgents({ agent }), [agent]);
  const d: any = q.data;
  const head = <SuiteHead art="pattern" eyebrow="Command" title="AI agents" sub="Six agents work through warranty claims, fault codes, health indicators, predictions and supplier records. Each finding states the pattern, the vehicles that share it, the evidence and the actions the agent proposes. Nothing is done until a person approves it. Demo data." />;
  if (q.error) return <div className="stack">{head}<ErrorBox msg={q.error} /></div>;
  if (!d) return <div className="stack">{head}<Loading /></div>;
  const t = d.totals, all = d.findings.flatMap((f: any) => f.actions), approved = all.filter((a: any) => done[a.id] === 'Approved').length, dismissed = all.filter((a: any) => done[a.id] === 'Dismissed').length;
  const types = C.bar(t.byType.map((x: any) => x[0]), [['Proposed actions', t.byType.map((x: any) => x[1])]], { lab: 1, horiz: 1, u: 'actions' });
  const decide = (a: any, s: string) => { setDone({ ...done, [a.id]: s }); toast(s === 'Approved' ? 'Approved. In a live deployment this would create the task in your quality system.' : 'Dismissed. The agent will not propose it again for this finding.'); };
  return (
    <div className="stack">
      {head}
      <Kpis items={[{ label: 'Findings', value: t.findings, note: `${t.newPatterns} without a case yet` }, { label: 'Actions proposed', value: t.actions, note: `${approved} approved, ${dismissed} dismissed` }, { label: 'Claims cost behind the findings', value: inr(t.cost) }, { label: 'Agents running', value: d.agents.length }]} />
      <div className="g12">
        <Panel title="The agents" sub="What each one watches and when it runs." span={8} noAi>
          <div className="agents">{d.agents.map((a: any) => (
            <div className="agent" key={a.id}>
              <span className="agent-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z" fill="currentColor" /></svg></span>
              <span><b>{a.name}</b><div className="small">{a.does}</div><div className="small muted">Reads: {a.inputs} · Runs: {a.runs} · Last run: {a.last}</div></span>
              <button className="btn small" onClick={() => setAgent(agent === a.id ? '' : a.id)} aria-pressed={agent === a.id}>{a.findings} findings</button>
            </div>
          ))}</div>
        </Panel>
        <Panel title="Proposed actions by type" span={4} charts={[types]}><Chart desc={types} height={320} /></Panel>
      </div>
      <Tabs tabs={[['', 'All findings'], ...d.agents.filter((a: any) => a.findings).map((a: any) => [a.id, a.name] as [string, string])]} value={agent} onChange={setAgent} />
      {d.findings.map((f: any) => (
        <div key={f.id} className={'finding ' + f.severity}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3><span className="mono small muted">{f.id}</span> {f.title}</h3>
            <span className="row"><Sparkline v={f.spark} /><Sev s={f.severity} /><span className="pill n">{f.confidence} confidence</span>{f.issue ? <span className="pill g">{f.issue}</span> : <span className="pill r">No case yet</span>}</span>
          </div>
          <div className="small muted">{f.agentName} · {f.modelName} · {fmt(f.claims)} claims · {inr(f.cost)}{f.sources.length ? ' · signals: ' + f.sources.join(', ').toLowerCase() : ''}</div>
          <ul>{f.summary.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
          {f.factors.length > 0 && (
            <div className="two">
              <div><h4>What the failed vehicles share</h4><FactorList factors={f.factors} /></div>
              <div className="stack" style={{ gap: '.5rem' }}>
                {f.rule && <div className="kvgrid"><div><span>Affected group</span><b>{f.rule.text}</b></div><div><span>Vehicles in the group</span><b>{fmt(f.rule.w)}</b></div><div><span>Failed so far</span><b>{f.rule.rate}%</b></div><div><span>Share of all failures</span><b>{f.rule.cover}%</b></div></div>}
                {f.precursor && <div className="note">Earliest warning in fault codes: <b>{f.precursor.code}</b> ({f.precursor.def}), a median of {f.precursor.lead} days before the claim.</div>}
              </div>
            </div>
          )}
          <div>
            <h4>Proposed actions</h4>
            {f.actions.map((a: any) => (
              <div key={a.id} className={'actrow' + (done[a.id] ? ' done' : '')}>
                <span className="pill n">{a.type}</span>
                <span>{a.text}</span>
                <span className="row">{done[a.id] ? <span className={'pill ' + (done[a.id] === 'Approved' ? 'g' : 'n')}>{done[a.id]}</span> : <><button className="btn pri small" onClick={() => decide(a, 'Approved')}>Approve</button><button className="btn small" onClick={() => decide(a, 'Dismissed')}>Dismiss</button></>}</span>
              </div>
            ))}
          </div>
          <div className="row">
            {f.comp && <button className="btn small" onClick={() => (f.issue ? go('rootcause', { tab: 'issue', id: f.issue }) : go('rootcause', { tab: 'issue', key: f.models[0] + '|' + f.comp }))}>Open issue analysis</button>}
            {f.comp && <button className="btn small" onClick={() => go('alerts', f.issue ? { issue: f.issue } : { compName: f.compName, modelName: f.modelName })}>See its {f.alerts.length} alerts</button>}
            {f.issue && f.safety >= 3 && <button className="btn small" onClick={() => go('recall', { id: f.issue })}>Recall risk list</button>}
            {f.agent === 'recov' && <button className="btn small" onClick={() => go('warranty', { tab: 'recovery' })}>Supplier recovery</button>}
          </div>
        </div>
      ))}
      <p className="small muted">Approvals are saved in this browser for the demo. A live deployment would write them to the quality system and record who approved.</p>
    </div>
  );
}
