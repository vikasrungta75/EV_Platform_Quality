'use client';
// Warranty intelligence: where the money goes, what drives it, which claims are abnormal, supplier recovery and the cost outlook.
import { useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Chart from '@/components/Chart';
import CohortBar, { CohortValue, useFilters } from '@/components/CohortBar';
import Panel from '@/components/Panel';
import { DataTable, ErrorBox, Kpis, Loading, Note, Select, StatusBadge, Tabs, fmt, inr } from '@/components/ui';
import { chart as C } from '@/lib/charts';
import { urlParam } from '@/lib/hooks';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';

const cr = (n: number) => +(n / 1e7).toFixed(2);
function Overview({ c }: { c: CohortValue }) {
  const { go } = useApp();
  const q = useQuery(() => ds.fetchWarOverview(c), [JSON.stringify(c)]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis;
  const mo = C.bar(d.monthly.x, d.monthly.seg, { stack: 1, u: 'Rs crore' });
  const rt = C.line(d.monthly.x, [['Claims per 1,000 vehicles in service', d.monthly.rate, { area: 1 }]], { u: 'per 1,000 a month' });
  const pa = C.bar(d.pareto.x, [['Cost, Rs crore', d.pareto.cost]], { horiz: 1, lab: 1, u: 'Rs crore' });
  const bm = C.bar(d.byModel.map((r: any) => r[0]), [['Cost per vehicle a year, Rs', d.byModel.map((r: any) => r[1])]], { horiz: 1, lab: 1, u: 'Rs' });
  const sp = C.donut(d.split.map((r: any) => [r[0], cr(r[1])]));
  const kn = C.donut(d.known.map((r: any) => [r[0], cr(r[1])]));
  const tile = C.tile(d.tile, { u: 'Rs per vehicle a year', hi: 'Higher', lo: 'Lower' });
  const mis = C.line(d.mis.x, d.mis.series, { u: 'claims per 1,000', xn: 'Months in service' });
  const top3 = d.pareto.cum.findIndex((v: number) => v >= 80) + 1;
  return (
    <>
      <Kpis items={[{ label: 'Warranty cost, 12 months', value: inr(k.cost), trend: k.trend, note: 'Trend is cost per vehicle-year' }, { label: 'Claims', value: fmt(k.claims), note: `${k.c1000} per 1,000 vehicles a year` }, { label: 'Cost per vehicle a year', value: inr(k.cpv) }, { label: 'Average claim', value: inr(k.avg) }, { label: 'Tied to open issues', value: k.linked + '%', note: 'The part earlier action can reduce' }, { label: 'No-fault-found', value: k.nff + '%', note: `${k.repeat}% repeat visits` }, { label: 'Supplier recovery', value: k.recovered + '%', note: 'Of the recoverable amount' }]} />
      <div className="g12">
        <Panel title="Cost by month and segment" span={7} charts={[mo]}><Chart desc={mo} height={280} /></Panel>
        <Panel title="How much of the cost is one fixable issue" sub="Cost in the last 12 months, Rs crore." span={5} charts={[kn]}><Chart desc={kn} height={280} /></Panel>
        <Panel title="Cost by component" sub={`${top3} components carry 80% of the cost.`} span={6} charts={[pa]} facts={d.pareto.x.slice(0, 5).map((x: string, i: number) => `${x}: Rs ${d.pareto.cost[i]} crore, cumulative ${d.pareto.cum[i]}%`)}><Chart desc={pa} height={420} /></Panel>
        <Panel title="Cost per vehicle by model" span={6} charts={[bm]}><Chart desc={bm} height={420} /></Panel>
        <Panel title="Cost by issue" sub="Select a row to open the issue analysis." span={12} data={d.issues}>
          <DataTable csv="warranty-by-issue.csv" columns={['Issue', 'Name', 'Status', 'Claims, 12 months', 'Cost, Rs crore', 'Share of all cost', 'No-fault-found']} rows={d.issues.map((r: any) => [r[0], r[1], r[2], r[3], cr(r[4]), r[5] + '%', r[6] + '%'])} render={(v, j) => (j === 2 ? <StatusBadge status={v} /> : undefined)} onRow={(r) => go('rootcause', { tab: 'issue', id: r[0] })} />
        </Panel>
        <Panel title="Claim rate by month" span={6} charts={[rt]}><Chart desc={rt} height={250} /></Panel>
        <Panel title="Claims by months in service, by build year" sub="Is each build year better than the last at the same age?" span={6} charts={[mis]}><Chart desc={mis} height={250} /></Panel>
        <Panel title="Parts, labour and other" sub="Rs crore." span={4} charts={[sp]}><Chart desc={sp} height={240} /></Panel>
        <Panel title="Cost per vehicle by state" span={4} charts={[tile]}><Chart desc={tile} height={240} /></Panel>
        <Panel title="Claim status" span={4} data={d.status}><DataTable columns={['Status', 'Claims']} rows={d.status} /><p className="small muted">Pending amount: {inr(k.pending)}.</p></Panel>
      </div>
    </>
  );
}
function Triangle({ c }: { c: CohortValue }) {
  const q = useQuery(() => ds.fetchWarTriangle(c), [JSON.stringify(c)]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const heat = C.heat(d.x, d.y, d.d, { u: 'claims per 1,000 vehicles', lab: 1, hi: 'More', lo: 'Fewer' });
  return (
    <div className="g12">
      <Panel title="Build month by months in service" sub="Cumulative claims per 1,000 vehicles. Read down a column to compare build months at the same age: a dark band is a bad build period. Empty cells are too young or too few." span={9} charts={[heat]}><Chart desc={heat} height={640} /></Panel>
      <Panel title="Worst build months at three months in service" sub={`Median across build months: ${d.median3} per 1,000.`} span={3} data={d.worst}><DataTable columns={['Build month', 'Claims per 1,000']} rows={d.worst} /><Note>Pick a component in the filter bar to see one failure mode. A band that appears for one component and one model is a lead for the supplier and plant screens.</Note></Panel>
    </div>
  );
}
function Dealers({ c }: { c: CohortValue }) {
  const q = useQuery(() => ds.fetchWarDealers(c), [JSON.stringify(c)]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const sc = C.scat(d.scatter, { xn: 'Claims per 100 vehicles sold', yn: 'Cost per claim against the same repairs elsewhere (1 = average)', hline: 1.2, ml: '', cols: ['c8', 'c1'] });
  return (
    <>
      <Kpis items={[{ label: 'Dealers with enough claims to judge', value: d.kpis.dealers }, { label: 'Flagged for review', value: d.kpis.flagged }, { label: 'Claim rate, top against bottom tenth', value: d.kpis.spread + 'x' }]} />
      <div className="g12">
        <Panel title="Claim rate against cost per claim" sub="Each claim is compared with the average for the same component and segment, so a dealer with a costly mix is not flagged unfairly." span={5} charts={[sc]}><Chart desc={sc} height={380} /></Panel>
        <Panel title="Dealer benchmark" sub="A flag is a reason to look, not a finding of abuse. High no-fault-found often means a training or tooling gap." span={7} data={d.rows.slice(0, 20)}>
          <DataTable csv="dealer-benchmark.csv" max="380px" columns={['Dealer', 'State', 'Claims', 'Per 100 vehicles', 'Cost index', 'Labour index', 'No-fault-found %', 'Repeat %', 'Rejected %', 'Flags']} rows={d.rows.map((r: any) => [r.dealer, r.state, r.claims, r.per100, r.idx, r.lab, r.nff, r.repeat, r.rejected, r.flags])} render={(v, j) => (j === 9 ? <span className={'pill ' + (v === 'None' ? 'n' : 'a')}>{v}</span> : undefined)} />
        </Panel>
      </div>
    </>
  );
}
function Claims({ c }: { c: CohortValue }) {
  const f = useFilters();
  const [p, setP] = useState<any>({ q: '', nff: '', status: '', issueId: '', page: 1 });
  const q = useQuery(() => ds.fetchWarClaims({ ...c, ...p }), [JSON.stringify(c), JSON.stringify(p)]);
  const d: any = q.data;
  return (
    <>
      <div className="pbar noprint">
        <label>Search<input type="search" value={p.q} onChange={(e) => setP({ ...p, q: e.target.value, page: 1 })} placeholder="Claim number, VIN or dealer" /></label>
        <Select label="Status" value={p.status} onChange={(v) => setP({ ...p, status: v, page: 1 })} options={['Approved', 'Pending', 'Rejected']} />
        <Select label="Issue" value={p.issueId} onChange={(v) => setP({ ...p, issueId: v, page: 1 })} options={f ? f.issues : []} />
        <Select label="No-fault-found" value={p.nff} onChange={(v) => setP({ ...p, nff: v, page: 1 })} options={[['1', 'Only no-fault-found']]} />
      </div>
      {q.error && <ErrorBox msg={q.error} />}
      {!d && !q.error && <Loading />}
      {d && (
        <Panel title={`Claims (${fmt(d.total)} sampled records)`} sub="Most recent first. Select a VIN for vehicle information." span={12} noAi>
          <DataTable csv="claims.csv" max="560px" columns={['Claim', 'Date', 'VIN', 'Model', 'Dealer', 'Part replaced', 'Symptom', 'Months in service', 'Odometer', 'Parts, Rs', 'Labour, Rs', 'Total, Rs', 'Status', 'No-fault-found', 'Repeat', 'Issue']} rows={d.rows} render={(v, j) => (j === 12 ? <StatusBadge status={v} /> : undefined)} />
          <div className="row noprint"><button className="btn small" disabled={d.page <= 1} onClick={() => setP({ ...p, page: d.page - 1 })}>Previous</button><span className="small muted">Page {d.page} of {Math.max(1, Math.ceil(d.total / d.size))}</span><button className="btn small" disabled={d.page * d.size >= d.total} onClick={() => setP({ ...p, page: d.page + 1 })}>Next</button></div>
        </Panel>
      )}
    </>
  );
}
function Recovery({ c }: { c: CohortValue }) {
  const q = useQuery(() => ds.fetchWarRecovery(c), [JSON.stringify(c)]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis, r = d.rows.slice(0, 12);
  const st = C.bar(r.map((x: any) => x.supplier), [['Recovered', r.map((x: any) => cr(x.recovered))], ['Claimed, awaiting supplier', r.map((x: any) => cr(x.awaiting))], ['Not yet claimed', r.map((x: any) => cr(x.notClaimed))]], { stack: 1, horiz: 1, u: 'Rs crore', scols: ['c3', 'c4', 'c8'] });
  const ag = C.bar(d.age.map((x: any) => x[0]), [['Open amount, Rs crore', d.age.map((x: any) => cr(x[1]))]], { lab: 1, u: 'Rs crore' });
  return (
    <>
      <Kpis items={[{ label: 'Recoverable from suppliers', value: inr(k.recoverable) }, { label: 'Recovered', value: inr(k.recovered), note: k.rate + '% of recoverable' }, { label: 'Claimed, awaiting supplier', value: inr(k.awaiting) }, { label: 'Not yet claimed', value: inr(k.notClaimed), note: 'Mostly issues without a confirmed cause' }]} />
      <div className="g12">
        <Panel title="Recovery by supplier" span={7} charts={[st]}><Chart desc={st} height={380} /></Panel>
        <Panel title="Age of the open amount" span={5} charts={[ag]}><Chart desc={ag} height={380} /></Panel>
        <Panel title="By supplier" span={7} data={d.rows}><DataTable csv="supplier-recovery.csv" columns={['Supplier', 'Claims', 'Recoverable, Rs crore', 'Recovered', 'Awaiting', 'Not yet claimed', 'Oldest open, days']} rows={d.rows.map((x: any) => [x.supplier, x.claims, cr(x.recoverable), cr(x.recovered), cr(x.awaiting), cr(x.notClaimed), Math.round(x.oldest)])} /></Panel>
        <Panel title="By issue" sub="Recovery starts once the cause is confirmed, which is why faster root cause brings money back sooner." span={5} data={d.byIssue}><DataTable columns={['Issue', 'Recovered, Rs crore', 'Open, Rs crore', 'Status']} rows={d.byIssue.map((x: any) => [x[0], cr(x[1]), cr(x[2]), x[3]])} render={(v, j) => (j === 3 ? <StatusBadge status={v} /> : undefined)} /></Panel>
      </div>
    </>
  );
}
function Reserve({ c }: { c: CohortValue }) {
  const q = useQuery(() => ds.fetchWarReserve(c), [JSON.stringify(c)]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis;
  const ln = C.line(d.x, [['If nothing changes', d.noAct], ['With countermeasures on plan', d.withAct], ['Ordinary failures only', d.base, { dash: 1 }], ['Current monthly provision', d.accrual, { dash: 1 }]], { u: 'Rs crore a month', noEnd: 1 });
  const hi = C.bar(d.hist.x, [['Actual cost', d.hist.v]], { u: 'Rs crore a month' });
  const bi = C.bar(d.byIssue.map((r: any) => r[0]), [['Next 12 months if nothing changes, Rs crore', d.byIssue.map((r: any) => r[1])]], { horiz: 1, lab: 1, u: 'Rs crore' });
  return (
    <>
      <Kpis items={[{ label: 'Next 12 months if nothing changes', value: inr(k.next12) }, { label: 'With countermeasures on plan', value: inr(k.withAct) }, { label: 'Cost avoided by the countermeasures', value: inr(k.avoid), note: 'Sooner is worth more' }, { label: 'Provision at the current rate', value: inr(k.accrual) }, { label: 'Shortfall if nothing changes', value: inr(Math.max(0, k.gap)) }]} />
      <Note>Outlook = ordinary failures at the current run-rate, plus failures from open issues taken from each issue's life curve. The countermeasure line assumes each fix reaches the field after a delay that depends on the issue's status. Demo assumptions; replace with your own.</Note>
      <div className="g12">
        <Panel title="Monthly cost outlook" span={8} charts={[ln]}><Chart desc={ln} height={320} /></Panel>
        <Panel title="Last 12 months, actual" span={4} charts={[hi]}><Chart desc={hi} height={320} /></Panel>
        <Panel title="Which issues drive the outlook" span={12} charts={[bi]}><Chart desc={bi} height={340} /></Panel>
      </div>
    </>
  );
}
export default function Warranty() {
  const [tab, setTab] = useState(urlParam('tab') || 'overview');
  const [c, setC] = useState<CohortValue>({});
  return (
    <div className="stack">
      <SuiteHead art="reports" eyebrow="Cost and source" title="Warranty intelligence" sub="Market quality owns warranty: this is where the money goes, how much of it is one fixable issue, which build months and dealers stand out, what is owed back by suppliers and what the next twelve months will cost. Demo data." />
      <Tabs tabs={[['overview', 'Cost and drivers'], ['triangle', 'Build month by age'], ['dealers', 'Dealer benchmark'], ['claims', 'Claim search'], ['recovery', 'Supplier recovery'], ['reserve', 'Cost outlook']]} value={tab} onChange={setTab} />
      <CohortBar value={c} onChange={setC} show={['seg', 'model', 'zone', 'state', 'plant', 'buildY', 'comp']} />
      {tab === 'overview' && <Overview c={c} />}
      {tab === 'triangle' && <Triangle c={c} />}
      {tab === 'dealers' && <Dealers c={c} />}
      {tab === 'claims' && <Claims c={c} />}
      {tab === 'recovery' && <Recovery c={c} />}
      {tab === 'reserve' && <Reserve c={c} />}
    </div>
  );
}
