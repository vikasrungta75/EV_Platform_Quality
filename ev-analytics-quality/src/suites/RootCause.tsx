'use client';
// AI root cause: the VIN failure report, the comparison workbench, pattern search, no-fault-found and repeat repair, and issue analysis.
import { useEffect, useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Chart from '@/components/Chart';
import CohortBar, { CohortValue, useFilters } from '@/components/CohortBar';
import Panel, { Spark } from '@/components/Panel';
import { DataTable, ErrorBox, Facts, Kpis, Loading, Meter, Note, Select, Sev, StatusBadge, Tabs, fmt, inr } from '@/components/ui';
import { chart as C } from '@/lib/charts';
import { urlParam } from '@/lib/hooks';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';
import { FactorList } from './Agents';

const Sec = ({ n, title, sub }: { n: number; title: string; sub?: string }) => (<div><div className="rsec"><span className="secnum">{n}</span><h2>{title}</h2></div>{sub && <p className="small muted" style={{ marginLeft: '2rem' }}>{sub}</p>}</div>);

/* ---------- VIN failure report ---------- */
function WebResearch({ vin, ai }: { vin: string; ai: boolean }) {
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setS(null); }, [vin]);
  const run = async () => { setBusy(true); try { setS(await ds.webResearch({ vin })); } catch (e: any) { setS({ source: 'error', error: e.message }); } setBusy(false); };
  return (
    <Panel title="What the public web says about this failure" sub="Recalls, investigations, known causes and remedies for the same failure mode on other electric vehicles. Only the component, fault code and failure mode are sent; the VIN and internal figures are not." span={12} noAi tools={<button className="btn pri small" onClick={run} disabled={busy}>{busy ? 'Searching…' : s ? 'Search again' : 'Search the web'}</button>}>
      {!s && !busy && <p className="small muted">{ai ? 'Live search is ready. Select "Search the web" to run it for this vehicle.' : 'Live search needs an AI key on this deployment (ANTHROPIC_API_KEY). Without one, this section shows the searches it would run.'}</p>}
      {busy && <Loading label="Searching and reading public sources" />}
      {s && s.source === 'web' && (<><div className="prosebox">{s.text}</div>{s.sources.length > 0 && <div><h4>Sources read</h4><ul className="small">{s.sources.map((x: any) => <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer">{x.title}</a></li>)}</ul></div>}<p className="small muted">Written by an AI model from live search results. Check a source before relying on it.</p></>)}
      {s && s.source === 'off' && (<><Note>Live search is switched off: no AI key is configured on this deployment. Nothing below is a search result.</Note><div><h4>Searches it would run</h4><ul className="small">{s.queries.map((x: string) => <li key={x}>{x}</li>)}</ul></div></>)}
      {s && s.source === 'error' && <ErrorBox msg={(s.error || 'The search failed.') + ' The rest of the report does not depend on it.'} />}
    </Panel>
  );
}
function Narrative({ vin, ai }: { vin: string; ai: boolean }) {
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setS(null); }, [vin]);
  if (!ai) return null;
  const run = async () => { setBusy(true); try { setS(await ds.writeReport({ vin })); } catch (e: any) { setS({ error: e.message }); } setBusy(false); };
  return (
    <div className="sage"><div className="sage-h"><span className="ai-chip"><Spark />AI written summary</span><button className="btn small" onClick={run} disabled={busy}>{busy ? 'Writing…' : s ? 'Write again' : 'Write the summary'}</button></div>
      {s && s.text && <div className="sage-b" style={{ whiteSpace: 'pre-wrap' }}>{s.text}</div>}{s && !s.text && <div className="small muted">The AI service did not return a summary. The computed verdict above stands.</div>}</div>
  );
}
function VinReport() {
  const { me, go, ask } = useApp();
  const [vin, setVin] = useState(urlParam('vin'));
  const [draft, setDraft] = useState(urlParam('vin'));
  const sq = useQuery(() => ds.fetchSamples(), []);
  const q = useQuery(() => (vin ? ds.fetchVinReport({ vin }) : Promise.resolve(null)), [vin]);
  const d: any = q.data, samples: any[] = (sq.data as any)?.samples || [];
  const pick = (v: string) => { setDraft(v); setVin(v); };
  return (
    <>
      <div className="panel s12 noprint">
        <form className="row" onSubmit={(e) => { e.preventDefault(); setVin(draft.trim().toUpperCase()); }}>
          <label style={{ flex: 1, minWidth: 240 }} className="small"><b>Vehicle identification number</b><input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Enter a VIN, for example MR9KX5XE…" style={{ width: '100%' }} className="mono" /></label>
          <button className="btn pri" style={{ alignSelf: 'flex-end' }}>Run failure analysis</button>
          {d && <button type="button" className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => window.print()}>Print report</button>}
        </form>
        <div><span className="eyebrow">Sample vehicles</span>
          <div className="chips" style={{ marginTop: '.3rem' }}>{samples.map((s) => <button key={s.vin} className="btn small" aria-pressed={vin === s.vin} onClick={() => pick(s.vin)} title={s.vin}>{s.label} <span className="muted">· {s.why}</span></button>)}</div>
        </div>
      </div>
      {q.error && <ErrorBox msg={q.error} />}
      {vin && !d && !q.error && <Loading label="Comparing the vehicle with its peers" />}
      {!vin && <Note>Enter a VIN or pick a sample. The report compares the vehicle with healthy vehicles and a similar population across every KPI, reads its fault-code sequence, predictions, warranty history, cohort history, bulletins, past cases and look-alike vehicles, and states the most likely cause and what to do.</Note>}
      {d && <Report d={d} ai={!!me.ai} go={go} ask={ask} />}
    </>
  );
}
function Report({ d, ai, go, ask }: { d: any; ai: boolean; go: any; ask: any }) {
  const c = d.conclusion, id = d.identity;
  const [kpi, setKpi] = useState<any>(null);
  const cand = C.bar(d.candidates.map((x: any) => x.name), [['Evidence score', d.candidates.map((x: any) => x.score)]], { horiz: 1, lab: 1, u: 'score, 0 to 100', max: 100 });
  const hl = C.bar(d.health.map((x: any) => x[0]), [['Health score', d.health.map((x: any) => x[1])]], { horiz: 1, u: 'score, 100 is healthy', max: 100, cols: d.health.map((x: any) => (x[1] < 40 ? 'c8' : x[1] < 70 ? 'c4' : 'c3')) });
  const dev = d.deviations.slice(0, 14), dv = C.bar(dev.map((r: any) => r.name), [['Standard deviations from healthy peers', dev.map((r: any) => r.zg)]], { horiz: 1, u: 'SD', cols: dev.map((r: any) => (r.comp && r.bad > 0 ? 'c8' : 'c1')) });
  const sys = C.bar(d.bySystem.map((r: any) => r[0]), [['Deviating KPIs', d.bySystem.map((r: any) => r[2])], ['Within normal range', d.bySystem.map((r: any) => r[1] - r[2])]], { stack: 1, horiz: 1, u: 'KPIs' });
  const pr = d.predicted.rows.slice(0, 6), pc = C.bar(pr.map((r: any) => r.comp), [['30 days', pr.map((r: any) => r.p[0])], ['60 days', pr.map((r: any) => r.p[1])], ['90 days', pr.map((r: any) => r.p[2])]], { u: '% chance of failure', max: 100 });
  const co = C.bar(d.cohort.rows.map((r: any) => r[0]), [['Vehicles with a ' + d.cohort.comp.toLowerCase() + ' claim, %', d.cohort.rows.map((r: any) => r[2])]], { horiz: 1, lab: '{c}%', u: '%', cols: d.cohort.rows.map((r: any) => (r[3] === 'Elevated' ? 'c8' : 'c1')) });
  return (
    <div className="stack" id="vin-report">
      <div className={'verdict' + (c.abnormal ? '' : ' ok')}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,.7)' }}>Failure analysis · {d.vin} · {id.model} · {d.generated}</span>
          <span className="row"><span className="pill">{c.confidence} confidence</span>{c.issue && <span className="pill">{c.issue.id} · {c.issue.status}</span>}</span>
        </div>
        <h2>{c.verdict}</h2>
        {c.evidence.length > 0 && <div><b>Evidence</b><ul>{c.evidence.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul></div>}
        <div><b>What to do</b><ul>{c.actions.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul></div>
        <div className="row noprint">
          {c.issue && <button className="btn ghost small" onClick={() => go('rootcause', { tab: 'issue', id: c.issue.id })}>Open {c.issue.id}</button>}
          <button className="btn ghost small" onClick={() => go('rootcause', { tab: 'compare', vin: d.vin })}>Compare with healthy peers</button>
          <button className="btn ghost small" onClick={() => ask(`Write a short note to the dealer about ${d.vin}: what we think is wrong and what to do.`, JSON.stringify(c))}>Draft dealer note with Sage</button>
        </div>
      </div>
      <Narrative vin={d.vin} ai={ai} />
      <Sec n={1} title="Vehicle" sub="Build, software, usage and where it is." />
      <Facts items={[['Model', id.model + ' · ' + id.kind], ['Battery', id.pack], ['Built', id.built + ' · ' + id.plant + ' ' + id.line + ' · shift ' + id.shift], ['Sold', id.sold], ['Age and distance', id.months + ' months · ' + fmt(id.odo) + ' km'], ['Usage', id.usage + ' · ' + id.daily + ' km a day · ' + id.dc + '% DC charging'], ['Location', id.city + ', ' + id.state + ' · ' + id.zone], ['Dealer', id.dealer], ['Software', id.sw + ' since ' + id.swDate], ['Telematics firmware', id.tcu], ['Warranty', id.warranty], ['Owner in quality', c.owner]]} />
      <Sec n={2} title="Which component, and how sure" sub="Five kinds of evidence are scored for every component: indicator drift, fault codes, cohort membership, an earlier repair that did not hold, and the failure prediction." />
      <div className="g12">
        <Panel title="Evidence score by component" span={5} charts={[cand]}><Chart desc={cand} height={250} /></Panel>
        <Panel title="The evidence behind each score" span={7} data={d.candidates}>
          <DataTable columns={['Component', 'Score', 'Indicator drift', 'Fault codes', 'Known cohort', 'Earlier claims', 'Prediction']} rows={d.candidates.map((x: any) => [x.name, x.score, x.signal, x.codes, x.cohort, x.prior, x.pred])} />
        </Panel>
        <Panel title="Match against known issues" sub="How much of each known issue's signature this vehicle shows." span={5} data={d.sigMatch}>
          <DataTable columns={['Issue', 'Indicators matched', 'Codes matched', 'In known cohort', 'Match']} rows={d.sigMatch.map((s: any) => [s.id + ' ' + s.name, s.kpis + ' of ' + s.ofK, s.ofC ? s.codes + ' of ' + s.ofC : 'No codes', s.cohort ? 'Yes' : 'No', s.match])} render={(v, j) => (j === 4 ? <><Meter v={v} tone={v >= 60 ? 'r' : v >= 40 ? 'a' : ''} />{v}%</> : undefined)} />
        </Panel>
        <Panel title="Component health" sub="100 is in line with healthy peers." span={7} charts={[hl]}><Chart desc={hl} height={Math.max(250, d.health.length * 21)} /></Panel>
      </div>
      <Sec n={3} title="Telemetry against healthy vehicles and a similar population" sub={`Compared with ${fmt(d.peers.good)} healthy ${id.model} vehicles and with ${fmt(d.peers.similar)} similar ones (${d.peers.simText}). ${d.peers.deviating} of ${d.peers.total} KPIs sit two standard deviations or more from healthy peers.`} />
      <div className="g12">
        <Panel title="Largest deviations" sub="Red bars are component health indicators on the bad side." span={7} charts={[dv]}><Chart desc={dv} height={380} /></Panel>
        <Panel title="Deviations by system" span={5} charts={[sys]}><Chart desc={sys} height={380} /></Panel>
        <Panel title="Every deviating KPI, with a note on each" sub="Select a row to read the note." span={12} data={d.deviations.slice(0, 20)}>
          <DataTable csv={`deviations-${d.vin}.csv`} max="330px" columns={['KPI', 'System', 'This vehicle', 'Healthy peers', 'Similar population', 'Unit', 'SD from healthy', 'SD from similar']} rows={d.deviations.map((r: any) => [r.name, r.catName, r.x, r.good, r.sim, r.unit, r.zg, r.zs])} onRow={(_, i) => setKpi(d.deviations[i])} sel={kpi ? d.deviations.indexOf(kpi) : undefined} />
          {kpi && <div className="sage"><div className="sage-h"><span className="ai-chip"><Spark />Analysis of this KPI</span><b>{kpi.name}</b></div><div className="sage-b">{kpi.note}</div></div>}
        </Panel>
        {d.trend.series.map((t: any) => { const ch = C.line(d.trend.x, [[t.name, t.v, { area: 1 }]], { u: t.unit, marks: [['Healthy peers', t.good, 'warn']] }); return <Panel key={t.name} title={t.name + ': last 26 weeks'} sub="Weekly value against the healthy average." span={d.trend.series.length === 1 ? 12 : d.trend.series.length === 2 ? 6 : 4} charts={[ch]}><Chart desc={ch} height={220} /></Panel>; })}
        {d.trips.map((t: any) => { const ch = C.line(Array.from({ length: 20 }, (_, i) => 'Trip ' + (i + 1)), [[t.name, t.v]], { u: t.unit, marks: [['Healthy 90th percentile', t.hi, 'warn'], ['Healthy 10th percentile', t.lo, 'warn']] }); return <Panel key={t.name} title={t.name + ': last 20 trips'} sub="Trip by trip, against the range of healthy vehicles." span={6} charts={[ch]}><Chart desc={ch} height={220} /></Panel>; })}
      </div>
      <Sec n={4} title="Fault codes and the fault sequence" sub="The order in which codes first appeared, matched against the known sequence for the suspected issue." />
      <div className="g12">
        {d.dtc.seq.length > 0 && (
          <Panel title={`Known sequence for ${d.dtc.seqIssue}`} sub="Filled steps have been seen on this vehicle. The dashed step is expected next." span={12} noAi>
            <div className="seqchain">{d.dtc.seq.map((s: any, i: number) => (<span key={s.code} style={{ display: 'contents' }}>{i > 0 && <span>→</span>}<div className={s.seen ? 'seen' : d.dtc.next && d.dtc.next.code === s.code ? 'next' : ''}><b className="mono">{s.code}</b><span className="small">{s.def}</span><span className="small muted">{s.seen ? 'First seen ' + s.when : d.dtc.next && d.dtc.next.code === s.code ? 'Expected in about ' + d.dtc.next.days + ' days' : 'Not seen'}</span></div></span>))}</div>
            {d.dtc.next && <Note>Next code expected: <b>{d.dtc.next.code}</b> ({d.dtc.next.def}, {d.dtc.next.crit.toLowerCase()}) in about {d.dtc.next.days} days. {d.dtc.next.does}</Note>}
          </Panel>
        )}
        <Panel title="Codes on this vehicle, oldest first" span={d.dtc.main ? 6 : 12} data={d.dtc.chain}>
          <DataTable columns={['Code', 'Definition', 'Criticality', 'First seen', 'Events', 'Active now', 'In the known sequence']} rows={d.dtc.chain.map((x: any) => [x.code, x.def, x.crit, x.first, x.n, x.active ? 'Yes' : 'No', x.inSeq ? 'Yes' : 'No'])} render={(v, j) => (j === 2 ? <Sev s={v} /> : undefined)} max="300px" />
          {d.dtc.chain.length === 0 && <p className="small muted">No fault code in the last 400 days.</p>}
        </Panel>
        {d.dtc.main && (
          <Panel title={`${d.dtc.main.code}: what it means`} sub={d.dtc.main.def} span={6} noAi>
            <div className="prose small" style={{ maxWidth: 'none' }}><div><b>What the vehicle does.</b> {d.dtc.main.does}</div><div><b>What the customer notices.</b> {d.dtc.main.notices}</div><div><b>Likely causes.</b> {d.dtc.main.causes}</div><div><b>Workshop check.</b> {d.dtc.main.check}</div><div><b>Remedy.</b> {d.dtc.main.fix}</div></div>
          </Panel>
        )}
        {d.dtc.events.length > 0 && <Panel title="Every event, with freeze-frame context" span={12} noAi><DataTable csv={`fault-codes-${d.vin}.csv`} max="260px" columns={['Date', 'Code', 'Definition', 'Criticality', 'State', 'Count', 'Phase', 'Charge %', 'Ambient °C', 'Speed km/h', 'Odometer']} rows={d.dtc.events} render={(v, j) => (j === 3 ? <Sev s={v} /> : undefined)} /></Panel>}
      </div>
      <Sec n={5} title="What is predicted for this vehicle" sub={`Chance of a breakdown from any component: ${d.predicted.any[0]}% in 30 days, ${d.predicted.any[1]}% in 60, ${d.predicted.any[2]}% in 90. Estimates are demo output, not a trained model.`} />
      <div className="g12">
        {pr.length > 0 && <Panel title="Failure probability by component" span={5} charts={[pc]}><Chart desc={pc} height={260} /></Panel>}
        <Panel title="Predicted failures and the evidence" span={pr.length ? 7 : 12} data={d.predicted.rows}>
          <DataTable columns={['Component', '30 days', '60 days', '90 days', 'Days to failure', 'Driver', 'Confidence', 'Evidence']} rows={d.predicted.rows.map((r: any) => [r.comp, r.p[0] + '%', r.p[1] + '%', r.p[2] + '%', r.ttf, r.driver, r.conf, r.evid.join('. ')])} />
          {d.predicted.rows.length === 0 && <p className="small muted">No component is above 2% in 90 days.</p>}
        </Panel>
      </div>
      <Sec n={6} title="Warranty, service and software history" />
      <DataTable csv={`history-${d.vin}.csv`} columns={['Date', 'Visit', 'What was done', 'Dealer', 'Odometer', 'Cost, Rs', 'No-fault-found']} rows={d.history.map((h: any) => [h.date, h.type, h.note, h.dealer, h.odo, h.cost, h.nff ? 'Yes' : ''])} render={(v, j) => (j === 6 && v ? <span className="pill r">Yes</span> : undefined)} />
      <Sec n={7} title="History of the model, component, lot, plant and geography" sub={`How often vehicles that share something with this one have had a ${d.cohort.comp.toLowerCase()} claim.`} />
      <div className="g12">
        <Panel title="Claim rate among vehicles that share a trait" sub="Red bars are at least twice the model average." span={7} charts={[co]}><Chart desc={co} height={270} /></Panel>
        <Panel title="Open issues on this model" span={5} data={d.cohort.issues}><DataTable columns={['Issue', 'Name', 'Status', 'Component', 'This vehicle in cohort']} rows={d.cohort.issues} render={(v, j) => (j === 2 ? <StatusBadge status={v} /> : undefined)} onRow={(r) => go('rootcause', { tab: 'issue', id: r[0] })} /></Panel>
        <Panel title="Component lots fitted to this vehicle" span={12} noAi><DataTable max="230px" columns={['Component', 'Supplier', 'Lot']} rows={id.lots} /></Panel>
      </div>
      <Sec n={8} title="Technical bulletins and past cases" sub="Sample documents written for the demo. A live deployment would search your own bulletin and case library." />
      <div className="g12">
        <Panel title="Matching technical bulletins" span={6} noAi>{d.bulletins.length === 0 && <p className="small muted">No bulletin matches.</p>}{d.bulletins.map((b: any) => <div key={b.id} className="alert"><span className="pill n">{b.id}</span><span><b>{b.title}</b><div className="small muted">{b.comp} · {b.date}</div><div className="small">{b.summary}</div><div className="small"><b>Action:</b> {b.action}</div></span></div>)}</Panel>
        <Panel title="Similar past cases" span={6} noAi>{d.pastCases.length === 0 && <p className="small muted">No past case matches.</p>}{d.pastCases.map((b: any) => <div key={b.id} className="alert"><span className="pill n">{b.id}</span><span><b>{b.title}</b><div className="small muted">{b.comp} · {b.type} · {b.time}</div><div className="small">{b.cause}</div><div className="small"><b>Lesson:</b> {b.lesson}</div></span></div>)}</Panel>
      </div>
      <Sec n={9} title="Vehicles that look like this one" sub="The 12 closest matches on component health indicators, among today's vehicles and records of vehicles shortly before they failed." />
      <Panel title={d.lookAlikes.summary} span={12} data={d.lookAlikes.rows}><DataTable columns={['VIN', 'City', 'Built', 'Distance', 'Record', 'Outcome']} rows={d.lookAlikes.rows} /></Panel>
      <Sec n={10} title="Public information" />
      <WebResearch vin={d.vin} ai={ai} />
      <div className="sage"><div className="sage-h"><b>Message for the customer</b></div><div className="sage-b">{c.customer}</div></div>
    </div>
  );
}

/* ---------- Compare workbench ---------- */
type SideSpec = { kind: 'vin' | 'pop'; vin?: string; f?: CohortValue; health?: string };
function SideEditor({ name, v, set }: { name: string; v: SideSpec; set: (s: SideSpec) => void }) {
  return (
    <div className="cmpside">
      <div className="row" style={{ justifyContent: 'space-between' }}><h3>Side {name}</h3>
        <div className="chips"><button className="btn small" aria-pressed={v.kind === 'vin'} onClick={() => set({ ...v, kind: 'vin' })}>One vehicle</button><button className="btn small" aria-pressed={v.kind === 'pop'} onClick={() => set({ ...v, kind: 'pop' })}>Population</button></div></div>
      {v.kind === 'vin' ? <label className="small"><b>VIN</b><input type="text" className="mono" style={{ width: '100%' }} value={v.vin || ''} onChange={(e) => set({ ...v, vin: e.target.value.toUpperCase() })} placeholder="MR9…" /></label> : (
        <CohortBar value={v.f || {}} onChange={(f) => set({ ...v, f })} show={['seg', 'model', 'zone', 'state', 'plant', 'usage', 'buildY']}>
          <Select label="Health state" value={v.health || ''} onChange={(h) => set({ ...v, health: h })} options={[['good', 'Healthy only'], ['failed', 'With a claim'], ['risk', 'At risk now']]} all="Any" />
        </CohortBar>
      )}
    </div>
  );
}
function Compare() {
  const { ask } = useApp();
  const f = useFilters();
  const v0 = urlParam('vin');
  const [A, setA] = useState<SideSpec>(v0 ? { kind: 'vin', vin: v0 } : { kind: 'pop', f: { model: 'KX5' }, health: 'risk' });
  const [B, setB] = useState<SideSpec>({ kind: 'pop', f: v0 ? {} : { model: 'KX5' }, health: 'good' });
  const [level, setLevel] = useState('aggregate');
  const [run, setRun] = useState<any>(null);
  const [only, setOnly] = useState(true);
  const [cat, setCat] = useState('');
  const [key, setKey] = useState('');
  const sq = useQuery(() => ds.fetchSamples(), []);
  // With a VIN from the address bar, default side B to healthy vehicles of the same model.
  useEffect(() => { if (v0 && f) { const m = (f.models as any[]).find((x) => v0.startsWith('MR9' + (x[0] + 'XX').slice(0, 4))); const b: SideSpec = { kind: 'pop', f: m ? { model: m[0] } : {}, health: 'good' }; setB(b); setRun({ a: { kind: 'vin', vin: v0 }, b, level: 'aggregate' }); } }, [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = useQuery(() => (run ? ds.fetchCompare({ a: run.a, b: run.b, level: run.level }) : Promise.resolve(null)), [JSON.stringify(run)]);
  const kq = useQuery(() => (run && key ? ds.fetchKpiDetail({ a: run.a, b: run.b, key }) : Promise.resolve(null)), [JSON.stringify(run), key]);
  const d: any = q.data, kd: any = kq.data, samples: any[] = (sq.data as any)?.samples || [];
  const go = () => { setKey(''); setRun({ a: A, b: B, level }); };
  const preset = (a: SideSpec, b: SideSpec, l = 'aggregate') => { setA(a); setB(b); setLevel(l); setKey(''); setRun({ a, b, level: l }); };
  const rows = d ? d.rows.filter((r: any) => (!only || r.flag) && (!cat || r.catName === cat)).sort((x: any, y: any) => Math.abs(y.z) - Math.abs(x.z)) : [];
  const sys = d && C.bar(d.bySys.map((s: any) => s.name), [['Large difference', d.bySys.map((s: any) => s.large)], ['Notable or subgroup', d.bySys.map((s: any) => s.notable)], ['No difference', d.bySys.map((s: any) => s.total - s.large - s.notable)]], { stack: 1, horiz: 1, u: 'KPIs', scols: ['c8', 'c4', 'c1'] });
  const top = d && d.top.length > 0 && C.bar(d.top.map((r: any) => r.name), [['Deviation score, A against B', d.top.map((r: any) => r.z)]], { horiz: 1, u: 'score', cols: d.top.map((r: any) => (r.comp && r.bad > 0 ? 'c8' : 'c1')) });
  return (
    <>
      <div className="panel s12 noprint">
        <div className="two"><SideEditor name="A" v={A} set={setA} /><SideEditor name="B" v={B} set={setB} /></div>
        <div className="row">
          <div className="chips"><button className="btn small" aria-pressed={level === 'aggregate'} onClick={() => setLevel('aggregate')}>Vehicle averages</button><button className="btn small" aria-pressed={level === 'trip'} onClick={() => setLevel('trip')}>Trip level</button></div>
          <button className="btn pri" onClick={go}>Compare across all KPIs</button>
          <span className="small muted">Try:</span>
          {samples[0] && <button className="btn small" onClick={() => preset({ kind: 'vin', vin: samples[0].vin }, { kind: 'pop', f: { model: 'KX5' }, health: 'good' })}>A failing VIN against healthy peers</button>}
          {samples[0] && samples[15] && <button className="btn small" onClick={() => preset({ kind: 'vin', vin: samples[0].vin }, { kind: 'vin', vin: samples[15].vin }, 'trip')}>Two VINs, trip level</button>}
          <button className="btn small" onClick={() => preset({ kind: 'pop', f: { model: 'LV1' }, health: 'risk' }, { kind: 'pop', f: { model: 'LV1' }, health: 'good' })}>At-risk vans against healthy vans</button>
          <button className="btn small" onClick={() => preset({ kind: 'pop', f: { model: 'ZS1', buildY: '2025' } }, { kind: 'pop', f: { model: 'ZS1', buildY: '2024' } })}>2025 scooters against 2024</button>
        </div>
      </div>
      {q.error && <ErrorBox msg={q.error} />}
      {run && !d && !q.error && <Loading label="Comparing every KPI" />}
      {!run && <Note>Choose what to compare on each side: a single vehicle or a population. The workbench compares them across every trip KPI and component health indicator, ranks the differences, writes a note for each one and summarises what the pattern points to.</Note>}
      {d && (
        <>
          <div className="sage"><div className="sage-h"><span className="ai-chip"><Spark />Summary of all findings</span><span className="small muted">A: {d.A.label} ({fmt(d.A.w)} vehicles) · B: {d.B.label} ({fmt(d.B.w)} vehicles) · {d.level}</span></div>
            <div className="sage-b"><ul style={{ margin: 0, paddingLeft: '1.1rem' }}>{d.findings.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>
            <div className="row noprint"><button className="btn small" onClick={() => ask('Explain this comparison and what I should check first.', JSON.stringify({ A: d.A, B: d.B, findings: d.findings, top: d.top.slice(0, 10).map((r: any) => [r.name, r.a, r.b, r.z]) }))}>Discuss with Sage</button></div></div>
          <Kpis items={[{ label: 'KPIs compared', value: d.rows.length }, { label: 'Standing out', value: d.flagged }, { label: 'Large differences', value: d.large }, { label: 'Pattern matches', value: d.match ? d.match.id : 'No known issue', note: d.match ? `${d.match.k} of ${d.match.of} indicators` : '' }]} />
          <div className="g12">
            {top && <Panel title="Largest differences" sub="Red bars are component health indicators where A is on the bad side. Select a bar for the detail." span={7} charts={[top]}><Chart desc={top} height={400} onClick={(p: any) => { const r = d.top.find((x: any) => x.name === p.name); if (r) setKey(r.key); }} /></Panel>}
            <Panel title="Differences by system" sub="Select a bar to filter the table." span={top ? 5 : 12} charts={[sys]}><Chart desc={sys} height={400} onClick={(p: any) => setCat(cat === p.name ? '' : p.name)} /></Panel>
            <Panel title={`All KPIs (${rows.length} shown)`} sub="Deviation score: for a vehicle against a population, standard deviations from the population mean; for two populations, the difference in means scaled so 2 is a medium and 3 a large effect. Select a row for the chart and the note." span={12} data={rows.slice(0, 25)}
              tools={<><label className="small row" style={{ gap: '.3rem' }}><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} />Only differences</label>{cat && <button className="btn small" onClick={() => setCat('')}>{cat} ×</button>}</>}>
              <DataTable csv="kpi-comparison.csv" max="420px" columns={['KPI', 'System', 'A', 'B', 'Unit', 'Difference', '% difference', 'Score', 'Finding', 'Note']} rows={rows.map((r: any) => [r.name, r.catName, r.a, r.b, r.unit, r.diff, r.pct === null ? '' : r.pct + '%', r.z, r.flag || 'None', r.note || ''])} render={(v, j) => (j === 8 ? <span className={'pill ' + (v === 'Large' ? 'r' : v === 'None' ? 'n' : 'a')}>{v}</span> : undefined)} onRow={(_, i) => setKey(rows[i].key)} sel={rows.findIndex((r: any) => r.key === key)} />
            </Panel>
            {key && kd && <KpiDetail kd={kd} d={d} row={d.rows.find((r: any) => r.key === key)} />}
            {key && !kd && !kq.error && <Loading />}
          </div>
        </>
      )}
    </>
  );
}
function KpiDetail({ kd, d, row }: { kd: any; d: any; row: any }) {
  const { openAnalysis } = useApp();
  const hist = kd.histB && C.hist(kd.bins, kd.histA || kd.histB, kd.histA ? kd.histB : null, { u: kd.unit, an: kd.histA ? 'A' : 'B', ...(kd.histA ? {} : { mark: kd.bins.findIndex((b: number) => b >= kd.aVal), ml: 'A' }) });
  const tx = Array.from({ length: 20 }, (_, i) => 'Trip ' + (i + 1));
  const trips = (kd.trips.a || kd.trips.b) && C.line(tx, [...(kd.trips.a ? [['A', kd.trips.a] as any] : []), ...(kd.trips.b ? [['B', kd.trips.b, { dash: 1 }] as any] : [])], { u: kd.unit, marks: kd.trips.band ? [['B 90th percentile', kd.trips.band[1], 'warn'], ['B 10th percentile', kd.trips.band[0], 'warn']] : [] });
  const wk = (kd.weekly.a || kd.weekly.b) && C.line(kd.weekly.x, [...(kd.weekly.a ? [['A', kd.weekly.a] as any] : []), ...(kd.weekly.b ? [['B', kd.weekly.b, { dash: 1 }] as any] : [])], { u: kd.unit, marks: kd.weekly.b ? [] : [['B average', kd.bVal, 'warn']] });
  const n = [hist, trips, wk].filter(Boolean).length || 1;
  return (
    <Panel title={kd.name} sub={`${kd.desc}. ${kd.cat}${kd.comp ? ' · health indicator for the ' + kd.comp.toLowerCase() : ''}. Normal range ${kd.range[0]} to ${kd.range[1]} ${kd.unit}.`} span={12} noAi
      tools={<button className="sumbtn" onClick={() => openAnalysis({ title: kd.name + ': A against B', sub: kd.desc, facts: [row?.note || '', `A is ${kd.aVal} ${kd.unit}; B is ${kd.bVal} ${kd.unit}.`, ...(kd.precursorOf.length ? ['Known precursor of ' + kd.precursorOf.join('; ')] : [])], data: JSON.stringify(kd).slice(0, 4000) })}><Spark />AI analysis</button>}>
      {row?.note && <div className="sage"><div className="sage-h"><span className="ai-chip"><Spark />Analysis of this KPI</span></div><div className="sage-b">{row.note}</div></div>}
      <Facts items={[['A', kd.aVal + ' ' + kd.unit], ['B', kd.bVal + ' ' + kd.unit], ['Score', row ? row.z : ''], ['Bad direction', kd.dir === 'lo' ? 'Low' : kd.dir === 'hi' ? 'High' : 'Not defined'], ['Known precursor of', kd.precursorOf.join('; ') || 'None']]} />
      <div className="g12">
        {hist && <div className={'s' + 12 / n}><h4>Distribution</h4><Chart desc={hist} height={230} /></div>}
        {trips && <div className={'s' + 12 / n}><h4>Last 20 trips</h4><Chart desc={trips} height={230} /></div>}
        {wk && <div className={'s' + 12 / n}><h4>Last 26 weeks</h4><Chart desc={wk} height={230} /></div>}
      </div>
    </Panel>
  );
}

/* ---------- Pattern search ---------- */
function Pattern() {
  const [conds, setConds] = useState<any[]>([['pump_current_a', '>', '6.5'], ['', '>', ''], ['', '>', '']]);
  const [f, setF] = useState<CohortValue>({});
  const [run, setRun] = useState<any>({ conds: [['pump_current_a', '>', '6.5']], f: {} });
  const base = useQuery(() => ds.fetchPattern({}), []);
  const q = useQuery(() => ds.fetchPattern({ conds: run.conds, f: run.f }), [JSON.stringify(run)]);
  const kp: any[] = (base.data as any)?.kpis || [], d: any = q.data;
  const setC = (i: number, j: number, v: string) => setConds(conds.map((c, k) => (k === i ? c.map((x: any, m: number) => (m === j ? v : x)) : c)));
  const bm = d && d.n > 0 && C.bar(d.byModel.map((r: any) => r[0]), [['Vehicles', d.byModel.map((r: any) => r[1])]], { lab: 1, u: 'vehicles' });
  return (
    <>
      <div className="panel s12 noprint">
        <p className="small muted">Find every vehicle that meets up to three KPI conditions, then see what they share and what became of them. Component health indicators are listed first.</p>
        {conds.map((c, i) => (
          <div className="row" key={i}>
            <select value={c[0]} onChange={(e) => { const k = kp.find((x) => x[0] === e.target.value); setConds(conds.map((y, m) => (m === i ? [e.target.value, y[1], k ? String(k[3]) : ''] : y))); }} style={{ flex: 2, minWidth: 220 }}><option value="">{i ? 'And (optional)' : 'Choose a KPI'}</option>{kp.map((k) => <option key={k[0]} value={k[0]}>{k[1]} ({k[2]})</option>)}</select>
            <select value={c[1]} onChange={(e) => setC(i, 1, e.target.value)}><option value=">">above</option><option value="<">below</option></select>
            <input type="text" value={c[2]} onChange={(e) => setC(i, 2, e.target.value)} placeholder="value" style={{ width: 110 }} />
          </div>
        ))}
        <CohortBar value={f} onChange={setF} show={['seg', 'model', 'zone', 'state', 'usage', 'buildY']}><button className="btn pri" onClick={() => setRun({ conds: conds.filter((c) => c[0] && c[2] !== ''), f })}>Search</button></CohortBar>
      </div>
      {q.error && <ErrorBox msg={q.error} />}
      {!d && !q.error && <Loading />}
      {d && d.conds.length > 0 && (
        <>
          <Kpis items={[{ label: 'Vehicles matching', value: fmt(d.w), note: `${d.share}% of the selection` }, { label: 'Already had a claim', value: d.claimed + '%', note: `Selection average ${d.baseClaimed}%` }, { label: 'At risk now', value: d.risk + '%', note: 'Failure more likely than not in 90 days' }, { label: 'What they share', value: d.rule || 'Nothing found' }]} />
          <div className="g12">
            {bm && <Panel title="Matches by model" span={4} charts={[bm]}><Chart desc={bm} height={240} /></Panel>}
            <Panel title="Open issues among the matches" span={4} data={d.byIssue}><DataTable columns={['Issue', 'Sampled vehicles']} rows={d.byIssue} /></Panel>
            <Panel title="First claim among the matches" span={4} data={d.comps}><DataTable columns={['Component claimed', 'Sampled vehicles']} rows={d.comps} /></Panel>
            <Panel title="Matching vehicles" span={12} noAi><DataTable csv="pattern-matches.csv" max="380px" columns={['VIN', 'Model', 'City', 'Built', ...d.cols, 'Claims', 'Highest risk']} rows={d.rows} /></Panel>
          </div>
        </>
      )}
    </>
  );
}

/* ---------- No-fault-found and repeat repair ---------- */
function Nff() {
  const [c, setC] = useState<CohortValue>({});
  const q = useQuery(() => ds.fetchNff(c), [JSON.stringify(c)]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis;
  const bc = C.bar(d.byComp.map((r: any) => r.name), [['No-fault-found, % of claims', d.byComp.map((r: any) => r.nff)], ['Repeat visits, % of claims', d.byComp.map((r: any) => r.repeat)]], { u: '%', horiz: 1 });
  const nodes = Array.from(new Set(d.links.flatMap((l: any) => [l[0], l[1]]))), sk = d.links.length > 0 && C.sankey(nodes, d.links);
  const tr = C.line(d.trend.x, [['No-fault-found', d.trend.nff], ['Repeat visits', d.trend.repeat]], { u: '% of claims' });
  return (
    <>
      <CohortBar value={c} onChange={setC} show={['seg', 'model', 'state', 'comp']} />
      <Kpis items={[{ label: 'No-fault-found share of claims', value: k.nffRate + '%', note: 'Last 12 months' }, { label: 'Repeat-visit rate', value: k.repeatRate + '%' }, { label: 'Cost of parts replaced without cause', value: inr(k.cost) }, { label: 'Vehicles with a repeat visit', value: fmt(k.vehicles) }, { label: 'Still not fixed', value: k.open, note: 'Sampled vehicles; the fault will return' }, { label: 'True cause identified', value: k.explained + '%', note: 'Of no-fault-found claims' }]} />
      <Note>A part that tests fault-free at the supplier, or a customer who returns with the same complaint, means the wrong part was replaced. Telemetry shows which component was really drifting at the time.</Note>
      <div className="g12">
        {sk && <Panel title="What was replaced, and what was actually wrong" sub="No-fault-found claims in the last 12 months, by vehicles." span={7} charts={[sk]}><Chart desc={sk} height={340} /></Panel>}
        <Panel title="By component claimed" span={sk ? 5 : 12} charts={[bc]}><Chart desc={bc} height={340} /></Panel>
        <Panel title="Vehicles with repeat visits" sub="The telemetry pointer names the component that was drifting, and the indicator a technician should check before replacing anything." span={12} data={d.chains.slice(0, 20)}>
          <DataTable csv="repeat-repairs.csv" max="380px" columns={['VIN', 'Model', 'City', 'Visits', 'Parts replaced', 'Cost, Rs', 'First visit', 'Last visit', 'State', 'Telemetry points to', 'Indicator to check', 'Issue']} rows={d.chains.map((r: any) => [r.vin, r.model, r.city, r.visits, r.parts, r.cost, r.first, r.last, r.state, r.pointer, r.kpi, r.issue])} render={(v, j) => (j === 8 ? <StatusBadge status={v} /> : undefined)} />
        </Panel>
        <Panel title="Trend" sub="Share of claims, by month." span={5} charts={[tr]}><Chart desc={tr} height={260} /></Panel>
        <Panel title="By dealer" sub="Dealers with the highest no-fault-found share; a training or diagnostic-tool signal." span={7} data={d.dealers.slice(0, 15)}>
          <DataTable csv="nff-dealers.csv" max="260px" columns={['Dealer', 'Claims', 'No-fault-found %', 'Repeat %', 'Cost of no-fault-found, Rs']} rows={d.dealers.map((r: any) => [r.dealer, r.claims, r.nff, r.repeat, r.cost])} />
        </Panel>
      </div>
    </>
  );
}

/* ---------- Issue analysis ---------- */
function Issue() {
  const { go, ask } = useApp();
  const [sel, setSel] = useState<any>(() => (urlParam('id') ? { id: urlParam('id') } : urlParam('key') ? { key: urlParam('key') } : { id: 'Q-106' }));
  const lq = useQuery(() => ds.fetchIssues(), []);
  const q = useQuery(() => ds.fetchIssue(sel), [JSON.stringify(sel)]);
  const L: any = lq.data, d: any = q.data;
  return (
    <>
      <div className="pbar noprint">
        <label>Issue or failure cluster
          <select value={sel.id || sel.key} onChange={(e) => setSel(e.target.value.includes('|') ? { key: e.target.value } : { id: e.target.value })} style={{ minWidth: 320 }}>
            {L && L.issues.map((i: any) => <option key={i.id} value={i.id}>{i.id} {i.name} · {i.status}</option>)}
            {L && L.clusters.map((c: any) => <option key={c.key} value={c.key}>No case: {c.title}</option>)}
            {sel.key && L && !L.clusters.some((c: any) => c.key === sel.key) && <option value={sel.key}>Selected cluster</option>}
          </select>
        </label>
        <span className="small muted">Every warranty issue is analysed the same way: what the failed vehicles share, what warned first, which cause fits best.</span>
      </div>
      {q.error && <ErrorBox msg={q.error} />}
      {!d && !q.error && <Loading />}
      {d && <IssueBody d={d} go={go} ask={ask} />}
    </>
  );
}
function IssueBody({ d, go, ask }: { d: any; go: any; ask: any }) {
  const k = d.kpis;
  const hy = C.bar(d.hyp.map((h: any) => h.type), [['Share of the evidence', d.hyp.map((h: any) => h.conf)]], { horiz: 1, lab: '{c}%', u: '%', max: 100 });
  const mis = C.line(d.mis.x, [...(d.mis.inRule ? [['Affected group', d.mis.inRule] as any] : []), ['Everyone else', d.mis.rest, { dash: 1 }]], { u: 'claims per 1,000', xn: 'Months in service' });
  const mo = C.bar(d.monthly.x, [['Claims a month', d.monthly.v]], { u: 'claims' });
  const tile = C.tile(d.tile, { u: '% of vehicles failed', hi: 'More', lo: 'Fewer' });
  const us = C.bar(d.usage.map((r: any) => r[0]), [['Failed, %', d.usage.map((r: any) => r[1])]], { lab: '{c}%', u: '%' });
  const ind = C.bar(d.indicators.map((r: any) => r.name), [['Affected vehicles', d.indicators.map((r: any) => r.aff)], ['Everyone else', d.indicators.map((r: any) => r.rest)]], { horiz: 1, u: 'SD on the bad side' });
  return (
    <div className="stack">
      <div className="verdict">
        <div className="row" style={{ justifyContent: 'space-between' }}><span className="eyebrow" style={{ color: 'rgba(255,255,255,.7)' }}>{d.id || 'No case yet'} · {d.comp} · {d.models} · owner: {d.owner}</span><span className="row"><span className="pill">{d.status}</span><span className="pill">Safety {d.safety} of 3</span></span></div>
        <h2>{d.name}</h2>
        {d.rule && <div><b>Affected group, found from the data:</b> {d.rule.text}. {fmt(d.rule.w)} vehicles; {d.rule.rate}% have failed against {d.rule.restRate}% of everyone else; the group holds {d.rule.cover}% of all failures.</div>}
        <div><b>Best-fitting cause:</b> {d.hyp[0].type} ({d.hyp[0].conf}% of the evidence). {d.hyp[0].evidence}.</div>
        {d.known && <div className="muted">{d.known.confirmed ? 'Confirmed cause' : 'Working hypothesis on file'}: {d.known.cause}</div>}
        <div className="row noprint">
          {d.id && <button className="btn ghost small" onClick={() => go('predict', { tab: 'vehicles', issueId: d.id })}>Vehicles at risk</button>}
          {d.id && d.safety >= 2 && <button className="btn ghost small" onClick={() => go('recall', { id: d.id })}>Recall risk list</button>}
          {d.id && <button className="btn ghost small" onClick={() => go('supplier', { tab: 'contain', id: d.id })}>Containment</button>}
          <button className="btn ghost small" onClick={() => go('alerts', d.id ? { issue: d.id } : { compName: d.comp })}>Alerts</button>
          <button className="btn ghost small" onClick={() => ask(`Draft a one-page problem description for ${d.id || d.name} for the weekly quality review.`, JSON.stringify({ name: d.name, kpis: d.kpis, rule: d.rule, hyp: d.hyp.slice(0, 3), known: d.known }))}>Draft review note with Sage</button>
        </div>
      </div>
      <Kpis items={[{ label: 'Claims to date', value: fmt(k.claims), note: inr(k.cost) }, { label: 'Vehicles not yet failed', value: fmt(k.open) }, { label: 'Expected failures, 90 days', value: fmt(k.e90), note: `${fmt(k.n30)} likely within 30 days` }, { label: 'No-fault-found', value: k.nff + '%', note: `${k.repeat}% repeat visits` }, { label: 'Warning before the claim', value: k.lead ?? 'n/a', unit: k.lead ? 'days' : '', note: 'Median, first fault code' }, { label: 'Average claim', value: inr(k.avgCost) }]} />
      <div className="stepper">{d.eightD.map((s: any, i: number) => <span key={s[0]} className={s[1] === 'Done' ? 'd' : s[1] === 'In progress' ? 'p' : ''}>D{i + 1} {s[0]}</span>)}</div>
      <div className="g12">
        <Panel title="Ranked hypotheses" sub="Each cause type is scored by how strongly its factors separate failed from healthy vehicles." span={5} charts={[hy]}><Chart desc={hy} height={250} /><DataTable columns={['Cause type', 'Strongest evidence']} rows={d.hyp.map((h: any) => [h.type, h.evidence])} /></Panel>
        <Panel title="What the failed vehicles share" sub="Includes the build window found by scanning every run of build months. Not adjusted for time in service." span={7} data={d.factors}><FactorList factors={d.factors} max={10} /></Panel>
        <Panel title="Cause map" sub="The strongest factors in each branch of a fishbone analysis." span={12} noAi>
          <div className="steps3">{d.fish.map((f: any) => <div key={f.name}><b>{f.name}</b>{f.items.length ? f.items.map((x: string) => <span className="small" key={x}>{x}</span>) : <span className="small muted">No signal</span>}</div>)}</div>
        </Panel>
        <Panel title="What warned first: fault codes" sub="Codes seen before the claim on failed vehicles, with the median days of warning." span={6} data={d.precursors}>
          <DataTable columns={['Code', 'Definition', 'Share of failed vehicles', 'Median days before claim']} rows={d.precursors.map((p: any) => [p.code, p.def, p.share + '%', p.lead])} />
          {d.precursors.length === 0 && <p className="small muted">No fault code reliably precedes this failure.</p>}
        </Panel>
        <Panel title="What warned first: health indicators" sub="Vehicles in the affected group that are showing symptoms, against everyone else." span={6} charts={[ind]}><Chart desc={ind} height={250} /></Panel>
        {d.timeline.length > 0 && <Panel title="Timeline" span={12} noAi><div className="timeline">{d.timeline.map((t: any) => <div key={t[0]}><b>{t[0]}</b><span className="small">{t[1]}</span><span className="small muted">{t[2]}</span></div>)}</div></Panel>}
        <Panel title="Claims by months in service" span={6} charts={[mis]}><Chart desc={mis} height={260} /></Panel>
        <Panel title="Claims by month" span={6} charts={[mo]}><Chart desc={mo} height={260} /></Panel>
        <Panel title="Where it fails" span={4} charts={[tile]}><Chart desc={tile} height={260} /></Panel>
        <Panel title="By usage" span={4} charts={[us]}><Chart desc={us} height={260} /></Panel>
        <Panel title="Symptoms and parts replaced" sub="Grouped by what the customer reported, not by repair code." span={4} data={[d.symptoms, d.replaced]}>
          <DataTable columns={['Customer symptom', 'Claims']} rows={d.symptoms} /><DataTable columns={['Part replaced', 'Claims']} rows={d.replaced} />
        </Panel>
        {d.known && <Panel title="Failure mode and action on file" span={6} noAi><div className="prose" style={{ maxWidth: 'none' }}><div><b>Failure mode.</b> {d.known.mode}</div><div><b>Cause ({d.known.causeType.toLowerCase()}).</b> {d.known.cause}</div><div><b>Action.</b> {d.known.fix}</div></div></Panel>}
        <Panel title="Bulletins and past cases" sub="Sample documents written for the demo." span={d.known ? 6 : 12} noAi>
          {d.bulletins.map((b: any) => <div key={b.id} className="alert"><span className="pill n">{b.id}</span><span><b>{b.title}</b><div className="small">{b.summary}</div></span></div>)}
          {d.pastCases.map((b: any) => <div key={b.id} className="alert"><span className="pill n">{b.id}</span><span><b>{b.title}</b><div className="small">{b.cause} <b>Lesson:</b> {b.lesson}</div></span></div>)}
          {d.bulletins.length + d.pastCases.length === 0 && <p className="small muted">Nothing on file.</p>}
        </Panel>
        <Panel title="Vehicles to inspect first" sub="Highest predicted risk. Select a VIN, then run the AI failure report." span={5} noAi><DataTable columns={['VIN', 'City', 'Built', 'Failure in 90 days', 'Days to failure', 'Claims']} rows={d.samples} /></Panel>
        <Panel title="Claims" span={7} noAi><DataTable csv="issue-claims.csv" max="300px" columns={['Claim', 'Date', 'VIN', 'Model', 'City', 'Months in service', 'Part replaced', 'Symptom', 'No-fault-found', 'Repeat', 'Cost, Rs']} rows={d.claims} /></Panel>
      </div>
    </div>
  );
}

export default function RootCause() {
  const [tab, setTab] = useState(urlParam('tab') || 'vin');
  return (
    <div className="stack">
      <SuiteHead art="systems" eyebrow="Investigate" title="AI root cause" sub="Enter a VIN for a full failure analysis that draws on every module. Compare any two vehicles or populations across hundreds of KPIs. Find the true cause behind repeat repairs. Analyse any warranty issue for what its failed vehicles share. Demo data." />
      <Tabs tabs={[['vin', 'VIN failure report'], ['compare', 'Compare workbench'], ['issue', 'Issue analysis'], ['nff', 'No-fault-found and repeat repair'], ['pattern', 'Pattern search']]} value={tab} onChange={setTab} />
      {tab === 'vin' && <VinReport />}
      {tab === 'compare' && <Compare />}
      {tab === 'issue' && <Issue />}
      {tab === 'nff' && <Nff />}
      {tab === 'pattern' && <Pattern />}
    </div>
  );
}
