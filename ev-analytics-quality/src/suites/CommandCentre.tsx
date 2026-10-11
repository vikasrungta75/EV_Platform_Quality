'use client';
// Quality command centre: what needs a decision today, what it will cost if left, and where to go next.
import { useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Chart from '@/components/Chart';
import CohortBar, { CohortValue } from '@/components/CohortBar';
import Panel from '@/components/Panel';
import { DataTable, ErrorBox, Kpis, Loading, Sev, Sparkline, StatusBadge, fmt, inr } from '@/components/ui';
import { chart as C } from '@/lib/charts';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';

export default function CommandCentre() {
  const { go } = useApp();
  const [c, setC] = useState<CohortValue>({});
  const q = useQuery(() => ds.fetchHome(c), [JSON.stringify(c)]);
  const d: any = q.data;
  const head = <SuiteHead art="safety" eyebrow="EV Analytics Quality" title="Quality command centre" sub="Every alert, issue and agent recommendation for the quality department in one place. Start here: see what needs a decision, what it will cost in the next 90 days if nothing changes, and open the module that deals with it. Demo data." />;
  if (q.error) return <div className="stack">{head}<ErrorBox msg={q.error} /></div>;
  if (!d) return <div className="stack">{head}<Loading /></div>;
  const k = d.kpis;
  const cost = C.bar(d.months, d.segCost, { stack: 1, u: 'Rs crore' });
  const rate = C.line(d.months, [['Claims per 1,000 vehicles in service', d.mrate, { area: 1 }]], { u: 'per 1,000 a month' });
  const sev = C.bar(d.sevBySource.src, d.sevBySource.rows, { stack: 1, u: 'alerts', horiz: 1, scols: ['c8', 'c2', 'c4', 'c1'] });
  const exp = C.bar(d.issues.slice(0, 10).map((i: any) => i.id + ' ' + i.name), [['90-day exposure', d.issues.slice(0, 10).map((i: any) => +(i.exposure / 1e7).toFixed(2))]], { horiz: 1, lab: 1, u: 'Rs crore' });
  const tile = C.tile(d.tile, { u: 'claims per 1,000 vehicles, 12 months', hi: 'More', lo: 'Fewer' });
  const fun = C.funnel(d.funnel);
  return (
    <div className="stack">
      {head}
      <CohortBar value={c} onChange={setC} show={['seg', 'model', 'zone', 'state']} />
      <Kpis items={[
        { label: 'Alerts not yet linked to a case', value: k.alertsOpen, note: `${k.alertsCritical} critical` },
        { label: 'Open quality issues', value: k.issuesOpen, note: `${k.emerging} emerging, no case yet` },
        { label: 'Warranty cost, 12 months', value: inr(k.cost12), trend: k.costTrend, note: `${k.linkedShare}% tied to open issues` },
        { label: 'Claims per 1,000 vehicles a year', value: k.c1000, note: `${inr(k.cpv)} per vehicle` },
        { label: 'Vehicles likely to fail in 90 days', value: fmt(k.risk90), note: `${fmt(k.risk30)} within 30 days` },
        { label: 'Cost if nothing changes, 90 days', value: inr(k.costRisk), note: 'Expected failures from open issues' },
        { label: 'Warning before a claim', value: k.lead ?? 'n/a', unit: 'days', note: 'Median, from the first fault code' },
      ]} />
      <div className="g12">
        <Panel title="Issues by 90-day exposure" sub="Expected failures in the next 90 days times the average claim cost. This is the cost that earlier action can still avoid." span={7} charts={[exp]}><Chart desc={exp} height={330} onClick={(p: any) => go('rootcause', { tab: 'issue', id: String(p.name).split(' ')[0] })} /></Panel>
        <Panel title="Open alerts by source and severity" sub="Nine independent detectors feed one list." span={5} charts={[sev]} tools={<button className="btn small" onClick={() => go('alerts')}>Open alert centre</button>}><Chart desc={sev} height={330} /></Panel>
        <Panel title="Issue register" sub="Select a row to open the issue analysis." span={12} data={d.issues}>
          <DataTable csv="issues.csv" columns={['Issue', 'Component', 'Models', 'Safety', 'Status', 'Owner', 'Vehicles at risk', 'Claims so far', 'Cost so far', 'Expected failures, 90 days', 'Likely within 30 days', 'Warning, days']}
            rows={d.issues.map((i: any) => [i.id + ' ' + i.name, i.comp, i.models, i.safety + ' of 3', i.status, i.owner, i.openW, i.claimsW, inr(i.cost), i.e90, i.n30, i.lead ?? 'No code'])}
            render={(v, j) => (j === 4 ? <StatusBadge status={v} /> : undefined)} onRow={(r) => go('rootcause', { tab: 'issue', id: String(r[0]).split(' ')[0] })} max="420px" />
        </Panel>
        <Panel title="What the AI agents found" sub="Patterns mined overnight from claims, fault codes, health indicators and predictions. Actions wait for approval." span={7} noAi tools={<button className="btn small" onClick={() => go('agents')}>All findings</button>}>
          {d.findings.map((f: any) => (
            <div key={f.id} className={'finding ' + f.severity}>
              <div className="row" style={{ justifyContent: 'space-between' }}><b>{f.title}</b><span className="row"><Sev s={f.severity} /><span className="pill n">{f.actions} actions proposed</span></span></div>
              <div className="small">{f.line}</div>
              <div className="small muted">{f.agent}{f.issue ? ' · ' + f.issue : ' · no case yet'}</div>
            </div>
          ))}
        </Panel>
        <Panel title="From signal to decision" sub="How last night's run narrowed millions of readings to the actions on your desk." span={5} charts={[fun]}><Chart desc={fun} height={330} /></Panel>
        <Panel title="Latest alerts" sub="Most severe first." span={12} noAi tools={<button className="btn small" onClick={() => go('alerts')}>See all and filter</button>}>
          <div className="alertlist">{d.topAlerts.map((a: any) => (
            <div className="alertrow" key={a.id}>
              <span><Sev s={a.severity} /><div className="small muted">{a.date}</div></span>
              <span><b>{a.title}</b><div className="small muted">{a.metric}</div><div className="tags"><span>{a.source}</span><span>{a.segName}</span><span>{a.owner}</span>{a.issue && <span>{a.issue}</span>}</div></span>
              <Sparkline v={a.spark} />
              <button className="btn small" onClick={() => (a.issue ? go('rootcause', { tab: 'issue', id: a.issue }) : go('early', { tab: 'claims', model: a.model, comp: a.comp }))}>Investigate</button>
            </div>
          ))}</div>
        </Panel>
        <Panel title="Warranty cost by month" sub="By segment, last 24 months." span={6} charts={[cost]}><Chart desc={cost} height={270} /></Panel>
        <Panel title="Claim rate by month" sub="Claims per 1,000 vehicles in service, so fleet growth does not hide the trend." span={6} charts={[rate]}><Chart desc={rate} height={270} /></Panel>
        <Panel title="Where claims come from" sub="Claims per 1,000 vehicles in the last 12 months, by state." span={5} charts={[tile]}><Chart desc={tile} height={330} /></Panel>
        <Panel title="By segment" sub="All EV segments use the same measures." span={7} data={d.segs}>
          <DataTable columns={['Segment', 'Vehicles in service', 'Claims per 1,000 a year', 'Cost per vehicle, Rs', 'Cost, Rs crore', 'Open alerts', 'Largest open issue']} rows={d.segs} />
        </Panel>
      </div>
    </div>
  );
}
