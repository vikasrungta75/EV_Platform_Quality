'use client';
// Alert centre: one list for every alert in quality, with a filter for every field so each specialist can pick up their own.
import { useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Chart from '@/components/Chart';
import Panel from '@/components/Panel';
import { ErrorBox, Kpis, Loading, Sev, Sparkline, StatusBadge, fmt } from '@/components/ui';
import { chart as C } from '@/lib/charts';
import { urlParam, useLocal } from '@/lib/hooks';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';
import { downloadCsv } from '@/services/http';

const FIELDS: [string, string][] = [['source', 'Source'], ['severity', 'Severity'], ['status', 'Status'], ['segName', 'Segment'], ['modelName', 'Model'], ['compName', 'Component'], ['system', 'System'], ['plant', 'Plant'], ['supplier', 'Supplier'], ['owner', 'Owner'], ['safety', 'Safety related'], ['issue', 'Linked issue']];
const COLS = ['Alert', 'Date', 'Severity', 'Source', 'Status', 'Segment', 'Model', 'Component', 'System', 'Plant', 'Supplier', 'Owner', 'Safety related', 'Linked issue', 'Title', 'Measure', 'Ratio', 'Vehicles', 'Where', 'Proposed action'];

export default function AlertCentre() {
  const { go, toast } = useApp();
  const [f, setF] = useState<Record<string, string>>(() => { const o: any = {}; for (const [k] of FIELDS) { const v = urlParam(k); if (v) o[k] = v; } return o; });
  const [open, setOpen] = useState<string | null>(null);
  const [mine, setMine] = useLocal<Record<string, string>>('evq_alert_state', {});
  const q = useQuery(() => ds.fetchAlerts(f), [JSON.stringify(f)]);
  const d: any = q.data;
  const head = <SuiteHead art="dtc" eyebrow="Command" title="Alert centre" sub="One place for every alert the quality department receives: warranty claims, fault codes, signal drift, predictions, supplier lots, plant process, software versions, no-fault-found and launch. Filter on any field, pick up what is yours, and open the investigation. Demo data." />;
  if (q.error) return <div className="stack">{head}<ErrorBox msg={q.error} /></div>;
  if (!d) return <div className="stack">{head}<Loading /></div>;
  const n = Object.values(f).filter(Boolean).length;
  const stOf = (a: any) => mine[a.id] || a.status;
  const sev = C.bar(d.bySeverity.map((x: any) => x[0]), [['Alerts', d.bySeverity.map((x: any) => x[1])]], { lab: 1, u: 'alerts', cols: ['c8', 'c2', 'c4', 'c1'] });
  const src = C.bar(d.bySource.map((x: any) => x[0]), [['Alerts', d.bySource.map((x: any) => x[1])]], { lab: 1, u: 'alerts', horiz: 1 });
  const own = C.bar(d.byOwner.map((x: any) => x[0]), [['Alerts', d.byOwner.map((x: any) => x[1])]], { lab: 1, u: 'alerts', horiz: 1 });
  const set = (a: any, s: string) => { setMine({ ...mine, [a.id]: s }); toast(`${a.id} marked "${s}". Saved in this browser for the demo.`); };
  return (
    <div className="stack">
      {head}
      <div className="filtergrid noprint">
        <label>Search<input type="search" value={f.q || ''} placeholder="Title, code, issue" onChange={(e) => setF({ ...f, q: e.target.value })} /></label>
        {FIELDS.map(([k, label]) => (
          <label key={k}>{label}
            <select value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
              <option value="">All</option>
              {(d.facets[k] || []).map((o: any) => <option key={o[0]} value={o[0]}>{o[0]} ({o[1]})</option>)}
            </select>
          </label>
        ))}
        <label>Raised in the last
          <select value={f.days || ''} onChange={(e) => setF({ ...f, days: e.target.value })}><option value="">Any time</option><option value="1">2 days</option><option value="7">7 days</option><option value="14">14 days</option></select>
        </label>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          {n > 0 && <button className="btn small" onClick={() => setF({})}>Reset ({n})</button>}
          <button className="btn small" onClick={() => downloadCsv('alerts.csv', [COLS, ...d.rows.map((a: any) => [a.id, a.date, a.severity, a.source, stOf(a), a.segName, a.modelName, a.compName, a.system, a.plant, a.supplier, a.owner, a.safety, a.issue || '', a.title, a.metric, a.ratio, a.vehicles, a.where, a.action])])}>Download CSV</button>
        </div>
      </div>
      <Kpis items={[{ label: 'Alerts shown', value: d.shown, note: `of ${d.total} open` }, { label: 'Critical', value: d.bySeverity[0][1] }, { label: 'High', value: d.bySeverity[1][1] }, { label: 'New, not yet picked up', value: d.rows.filter((a: any) => stOf(a) === 'New').length }, { label: 'Vehicles behind these alerts', value: fmt(d.vehicles), note: 'Largest alert per model and component' }]} />
      <div className="g12">
        <Panel title="By severity" span={3} charts={[sev]}><Chart desc={sev} height={220} /></Panel>
        <Panel title="By source" sub="Select a bar to filter." span={5} charts={[src]}><Chart desc={src} height={220} onClick={(p: any) => setF({ ...f, source: p.name })} /></Panel>
        <Panel title="By owner" sub="Select a bar to filter." span={4} charts={[own]}><Chart desc={own} height={220} onClick={(p: any) => setF({ ...f, owner: p.name })} /></Panel>
      </div>
      <Panel title={`Alerts (${d.shown})`} sub="Most severe first. Open an alert for its evidence, then acknowledge it, take it, or go to the investigation." span={12} data={d.rows.slice(0, 30).map((a: any) => [a.severity, a.source, a.title, a.metric])}>
        <div className="alertlist">
          {d.rows.length === 0 && <div className="alertrow"><span /><span className="muted">No alert matches these filters.</span></div>}
          {d.rows.map((a: any) => (
            <div key={a.id}>
              <div className="alertrow" role="button" tabIndex={0} onClick={() => setOpen(open === a.id ? null : a.id)} onKeyDown={(e) => e.key === 'Enter' && setOpen(open === a.id ? null : a.id)} style={{ cursor: 'pointer' }}>
                <span><Sev s={a.severity} /><div className="small muted">{a.date}</div><div className="small mono">{a.id}</div></span>
                <span><b>{a.title}</b><div className="small muted">{a.metric}</div>
                  <div className="tags"><span>{a.source}</span><span>{a.segName}</span><span>{a.modelName}</span><span>{a.compName}</span><span>{a.plant}</span>{a.supplier && <span>{a.supplier}</span>}<span>{a.owner}</span>{a.safety === 'Yes' && <span>Safety related</span>}{a.issue && <span>{a.issue}</span>}</div></span>
                <Sparkline v={a.spark} />
                <StatusBadge status={stOf(a)} />
              </div>
              {open === a.id && (
                <div style={{ padding: '.7rem .9rem 1rem', background: 'var(--panel2)', borderTop: '1px solid var(--line)' }} className="stack">
                  <div className="kvgrid"><div><span>Against expected</span><b>{a.ratio} times</b></div><div><span>Vehicles involved</span><b>{fmt(a.vehicles)}</b></div><div><span>Where it concentrates</span><b>{a.where}</b></div><div><span>System</span><b>{a.system}</b></div><div><span>Linked issue</span><b>{a.issue ? a.issue + ' ' + a.issueName : 'None yet'}</b></div></div>
                  <div className="small"><b>Proposed action:</b> {a.action}.</div>
                  <div className="row">
                    <button className="btn pri small" onClick={() => (a.issue ? go('rootcause', { tab: 'issue', id: a.issue }) : go('rootcause', { tab: 'issue', key: a.model + '|' + a.comp }))}>Open root cause</button>
                    {a.source === 'Fault codes' && <button className="btn small" onClick={() => go('early', { tab: 'dtc', code: a.code || '' })}>Fault code detail</button>}
                    {a.source === 'Predictive' && <button className="btn small" onClick={() => go('predict', { tab: 'vehicles', model: a.model, comp: a.comp })}>Vehicle list</button>}
                    {a.source === 'Supplier lot' && <button className="btn small" onClick={() => go('supplier', { comp: a.comp })}>Supplier view</button>}
                    <button className="btn small" onClick={() => go('early', { tab: 'claims', model: a.model, comp: a.comp })}>Trend and factors</button>
                    <button className="btn small" onClick={() => set(a, 'Acknowledged')}>Acknowledge</button>
                    <button className="btn small" onClick={() => set(a, 'In investigation')}>Take it</button>
                    <button className="btn small" onClick={() => set(a, 'Closed: not an issue')}>Close as not an issue</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
