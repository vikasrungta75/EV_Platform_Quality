'use client';
// Recall risk list: scope the affected population, then order vehicles by failure probability and time to failure.
import { useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Chart from '@/components/Chart';
import Panel from '@/components/Panel';
import { DataTable, ErrorBox, Facts, Kpis, Loading, Note, StatusBadge, fmt, inr } from '@/components/ui';
import { chart as C } from '@/lib/charts';
import { urlParam, useLocal } from '@/lib/hooks';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';

const BAND_COL = ['var(--c8)', 'var(--c2)', 'var(--c4)', 'var(--c1)', 'var(--q1)'];

function IssueList({ id }: { id: string }) {
  const { me, toast } = useApp();
  const [weeks, setWeeks] = useState('12');
  const [approved, setApproved] = useLocal<Record<string, string>>('evq_recall', {});
  const q = useQuery(() => ds.fetchRecallIssue({ id, weeks }), [id, weeks]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis, lim = d.restricted, ho = approved[d.id] || d.handover;
  const fun = C.funnel(d.funnel);
  const sc = C.line(d.scenario.x, [['No action', d.scenario.none], ['Called in by build date', d.scenario.byBuild, { dash: 1 }], ['Called in by risk', d.scenario.byRisk]], { u: 'failures in the field, cumulative' });
  const ttf = C.bar(d.ttf.map((r: any) => r[0]), [['Vehicles', d.ttf.map((r: any) => r[1])]], { lab: 1, u: 'vehicles' });
  const gain = C.line(d.gain.map((g: any) => g[0] + '%'), [['Failures reached', d.gain.map((g: any) => g[1])], ['Random order', d.gain.map((g: any) => g[0]), { dash: 1 }]], { u: '% of failures within 90 days', xn: 'Share of the list contacted, in risk order' });
  const tile = C.tile(d.tile, { u: 'vehicles to contact now or within 30 days', hi: 'More', lo: 'Fewer' });
  const tot = d.bands.reduce((t: number, b: any) => t + b.w, 0) || 1;
  return (
    <div className="stack">
      <div className="verdict">
        <div className="row" style={{ justifyContent: 'space-between' }}><span className="eyebrow" style={{ color: 'rgba(255,255,255,.7)' }}>{d.id} · {d.comp} · safety {d.safety} of 3</span><span className="row"><span className="pill">{d.status}</span><span className="pill">{ho}</span></span></div>
        <h2>{d.name}</h2>
        <div>{d.mode}</div>
        {d.cause && <div className="muted">{d.cause}</div>}
        <div><b>Remedy:</b> {d.fix}</div>
        {!lim && me.role?.id === 'QLT' && (
          <div className="row noprint">
            {!ho.startsWith('Approved') && <button className="btn ghost small" onClick={() => { setApproved({ ...approved, [d.id]: 'Approved in this browser (demo)' }); toast('Marked approved for the recall office. In a live deployment the head of quality signs this off and the list is released.'); }}>Approve and hand to recall office</button>}
            <span className="small muted">Campaign planning and customer contact are outside this product: the recall office takes the list from here.</span>
          </div>
        )}
      </div>
      <Kpis items={[{ label: 'Vehicles on the list', value: fmt(k.open), note: 'Affected and not yet repaired' }, { label: 'Contact now', value: fmt(k.now), note: 'More likely than not to fail within 30 days' }, { label: 'Contact within 30 days', value: fmt(k.d30 - k.now) }, { label: 'Failures expected in 90 days', value: fmt(k.e90) }, { label: 'First quarter of the list reaches', value: k.firstCapture + '%', note: 'of failures due within 90 days' }, ...(lim ? [] : [{ label: 'Unsold vehicles to hold', value: fmt(k.stock) }])]} />
      <div className="g12">
        <Panel title="Priority bands" sub="Who to bring in, in what order, and how long each group has." span={12} data={d.bands}>
          <div className="bandbar" role="img" aria-label="Share of the list in each priority band">{d.bands.map((b: any, i: number) => <i key={b.band} style={{ width: (b.w / tot) * 100 + '%', background: BAND_COL[i] }} title={`${b.band}: ${b.w.toLocaleString('en-IN')}`} />)}</div>
          <DataTable columns={['Priority', 'Vehicles', 'Share of list', 'Failures expected, 90 days', 'Median days to failure']} rows={d.bands.map((b: any) => [b.band, b.w, b.share + '%', b.e90, b.ttf ?? ''])} render={(v, j) => (j === 0 ? <StatusBadge status={v} /> : undefined)} />
        </Panel>
        <Panel title="From everything built to who is at risk" sub="Risk-based scoping narrows the population step by step." span={5} charts={[fun]}><Chart desc={fun} height={320} /></Panel>
        <Panel title="Blanket order against risk order" sub={`Same workshop capacity (${fmt(k.perWeek)} vehicles a week over ${k.weeks} weeks, starting in week 3; three in ten customers come late). The gap between the lines is failures avoided.`} span={7} charts={[sc]}
          facts={[`Risk order avoids ${d.scenario.avoidedRisk} failures over 26 weeks; build-date order avoids ${d.scenario.avoidedBuild}.`, `Risk order prevents ${d.scenario.extra} more failures than build-date order.`]}
          tools={<label className="small row" style={{ gap: '.3rem' }}>Weeks to complete<select value={weeks} onChange={(e) => setWeeks(e.target.value)}>{['6', '12', '20'].map((w) => <option key={w}>{w}</option>)}</select></label>}>
          <Chart desc={sc} height={290} />
          <div className="small"><b>{fmt(d.scenario.extra)} more failures prevented</b> by calling vehicles in by risk instead of by build date{d.scenario.extraCost !== null ? `, worth about ${inr(d.scenario.extraCost)} in claims` : ''}. Simulated on demo data.</div>
        </Panel>
        <Panel title="When the vehicles are expected to fail" span={4} charts={[ttf]}><Chart desc={ttf} height={250} /></Panel>
        <Panel title="How well the order finds the failures" sub="Simulated back-test." span={4} charts={[gain]}><Chart desc={gain} height={250} /></Panel>
        <Panel title="Where the urgent vehicles are" span={4} charts={[tile]}><Chart desc={tile} height={250} /></Panel>
        <Panel title="Risk-ranked vehicle list" sub={`Highest risk first. Demo shows sampled vehicles: the first ${d.list.length} of ${d.total} rows, each standing for the number of vehicles in the last column. Risk score combines the three probabilities and how hard the vehicle is used.`} span={12} data={d.list.slice(0, 20)}>
          <DataTable csv={`recall-risk-list-${d.id}.csv`} max="520px" columns={['Rank', 'VIN', 'Model', 'City', 'State', 'Dealer', 'Usage', 'Risk score', 'Fail in 30 days', '60 days', '90 days', 'Days to failure', 'Priority', 'Evidence', 'Stands for']}
            rows={d.list.map((r: any) => [r.rank, r.vin, r.model, r.city, r.state, r.dealer, r.usage, r.score, r.p[0] + '%', r.p[1] + '%', r.p[2] + '%', r.ttf, r.band, r.evid, r.stands])} render={(v, j) => (j === 12 ? <StatusBadge status={v} /> : undefined)} />
        </Panel>
        <Panel title="Dealer load for the first wave" sub="First quarter of the list, by dealer, against that dealer's whole share." span={lim ? 12 : 7} data={d.dealers}><DataTable csv="first-wave-dealers.csv" max="300px" columns={['Dealer', 'First wave', 'Whole list']} rows={d.dealers} /></Panel>
        {d.stock && <Panel title="Unsold vehicles to hold" sub={d.stock.clean ? `Clean build point estimated from the data: ${d.stock.clean}.` : ''} span={5} data={d.stock.rows}><DataTable columns={['Where', 'Vehicles']} rows={d.stock.rows} /></Panel>}
      </div>
    </div>
  );
}

export default function Recall() {
  const { me } = useApp();
  const [id, setId] = useState(urlParam('id'));
  const q = useQuery(() => ds.fetchRecallCandidates(), []);
  const d: any = q.data;
  const head = <SuiteHead art="atlas" eyebrow="Predict and act" title="Recall risk list" sub="For each safety-related issue: the affected population, and every vehicle ordered by its chance of failure and how long it has. The highest-risk vehicles are reached first, with the same workshop capacity. Campaign planning and customer contact stay with the recall office. Demo data." />;
  if (q.error) return <div className="stack">{head}<ErrorBox msg={q.error} /></div>;
  if (!d) return <div className="stack">{head}<Loading /></div>;
  const k = d.kpis, sel = id || (d.rows[0] && d.rows[0].id);
  const sc = C.scat(d.scatter, { xn: 'Vehicles not yet repaired', yn: 'Expected to fail in 90 days, %', cols: d.scatter.map((s: any) => ({ 'Safety 3': 'c8', 'Safety 2': 'c2', 'Safety 1': 'c4', 'Safety 0': 'c1' } as any)[s[0]]) });
  return (
    <div className="stack">
      {head}
      {d.restricted && <Note>You are signed in as the recall office. You see only the lists quality has approved, without warranty cost, supplier or plant detail.</Note>}
      <Kpis items={[{ label: 'Recall candidates', value: k.candidates, note: 'Safety severity 3' }, { label: 'Vehicles in scope', value: fmt(k.vehicles) }, { label: 'To contact now', value: fmt(k.now) }, { label: 'Lists approved for the recall office', value: k.approved }]} />
      <div className="g12">
        <Panel title="Issues ranked for field action" sub="Score combines safety severity, vehicles still at risk and how fast they are failing. Select a row for its risk list." span={d.restricted ? 12 : 8} data={d.rows}>
          <DataTable csv="recall-candidates.csv" columns={['Issue', 'Component', 'Models', 'Safety', 'Vehicles at risk', 'Failed so far', 'Expected failures, 90 days', 'Contact now', 'Score', 'Recommended action', 'Handover']} rows={d.rows.map((r: any) => [r.id + ' ' + r.name, r.comp, r.models, r.safety + ' of 3', r.openW, r.failedPct + '%', r.e90, r.n30, r.score, r.rec, r.handover])}
            render={(v, j) => (j === 9 ? <span className={'pill ' + (v === 'Recall candidate' ? 'r' : v.startsWith('Service') ? 'a' : 'n')}>{v}</span> : j === 10 ? <StatusBadge status={v} /> : undefined)} onRow={(_, i) => setId(d.rows[i].id)} sel={d.rows.findIndex((r: any) => r.id === sel)} />
        </Panel>
        {!d.restricted && <Panel title="Size against hazard" sub="Right: more vehicles. Up: failing faster." span={4} charts={[sc]}><Chart desc={sc} height={300} /></Panel>}
      </div>
      {sel ? <IssueList key={sel} id={sel} /> : <Note>No list has been approved for the recall office yet.</Note>}
      {me.role?.id === 'RCL' && <Facts items={[['Your profile', 'Recall office'], ['What you can open', 'Approved lists and vehicle look-up']]} />}
    </div>
  );
}
