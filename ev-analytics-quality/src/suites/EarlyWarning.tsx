'use client';
// Early warning: emerging issues from warranty claims, with fault codes, signal drift and predictions as earlier signals; plus the launch monitor.
import { useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Chart from '@/components/Chart';
import CohortBar, { CohortValue } from '@/components/CohortBar';
import Panel from '@/components/Panel';
import { DataTable, ErrorBox, Facts, Kpis, Loading, Note, Select, Sev, Sparkline, StatusBadge, Tabs, fmt, inr } from '@/components/ui';
import { chart as C } from '@/lib/charts';
import { urlParam } from '@/lib/hooks';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';
import { FactorList } from './Agents';

const Tick = ({ on }: { on: boolean }) => <span className={'pill ' + (on ? 'r' : 'n')}>{on ? 'Fired' : 'Quiet'}</span>;

function Claims({ c }: { c: CohortValue }) {
  const { go } = useApp();
  const [sel, setSel] = useState<{ model: string; comp: string } | null>(() => (urlParam('model') && urlParam('comp') ? { model: urlParam('model'), comp: urlParam('comp') } : null));
  const q = useQuery(() => ds.fetchEwOverview(c), [JSON.stringify(c)]);
  const dq = useQuery(() => (sel ? ds.fetchEwIssue(sel) : Promise.resolve(null)), [JSON.stringify(sel)]);
  const d: any = q.data, x: any = dq.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis;
  const bub = C.scat([['Flagged model and component', d.bubble]], { xn: 'Claims against expected (times)', yn: 'Cost in 90 days, Rs crore', vline: 1.7, ml: '' });
  const heat = C.heat(d.heat.x, d.heat.y, d.heat.d, { u: 'times expected', lab: 1, min: 0, max: 6, hi: 'Far above', lo: 'As expected' });
  const wk = C.bar(d.weekly.x, [['Claims tied to a pattern', d.weekly.linked], ['Other claims', d.weekly.other]], { stack: 1, u: 'claims a week' });
  const ord = C.bar(d.order.map((o: any) => o.id), [['Health-indicator drift', d.order.map((o: any) => o.drift)], ['First fault code', d.order.map((o: any) => o.codes || 0)]], { u: 'days before the claim' });
  return (
    <>
      <Kpis items={[{ label: 'Model and component pairs watched', value: k.watched }, { label: 'Flagged by at least one signal', value: k.flagged, note: `${k.multi} by three or more` }, { label: 'Flagged with no case yet', value: k.noCase }, { label: 'Claims in 90 days on flagged pairs', value: fmt(k.claims90) }, { label: 'Cost in 90 days on flagged pairs', value: inr(k.cost90) }, { label: 'Longest warning before a claim', value: k.earliest, unit: 'days', note: 'From health-indicator drift' }]} />
      <div className="g12">
        <Panel title="Emerging issues" sub="Each row compares the last 90 days of claims with the 270 days before. The four columns on the right show which independent signals have fired. Select a row for the detail." span={12} data={d.rows.slice(0, 25)}>
          <DataTable csv="emerging-issues.csv" max="440px" columns={['Model', 'Component', 'Claims, 90 days', 'Per 1,000', 'Expected', 'Times expected', 'Strength', 'Trend, 26 weeks', 'Claims', 'Codes', 'Drift', 'Predictive', 'Severity', 'Case']}
            rows={d.rows.map((r: any) => [r.modelName, r.compName, r.claims90, r.rate, r.expected, r.ratio, r.z, r.spark, r.sClaims, r.sCodes, r.sDrift, r.sPred, r.severity, r.issue ? r.issue + ' · ' + r.status : r.status])}
            render={(v, j) => (j === 7 ? <Sparkline v={v} /> : j >= 8 && j <= 11 ? <Tick on={v} /> : j === 12 ? <Sev s={v} /> : undefined)}
            onRow={(_, i) => setSel({ model: d.rows[i].model, comp: d.rows[i].comp })} sel={sel ? d.rows.findIndex((r: any) => r.model === sel.model && r.comp === sel.comp) : undefined} />
        </Panel>
        {sel && (
          <Panel title={x ? `${x.comp} on ${x.model}` : 'Loading detail'} sub="When the rate started to move, which vehicles share the failure, and what warned first." span={12} noAi tools={x && <button className="btn pri small" onClick={() => (x.issue ? go('rootcause', { tab: 'issue', id: x.issue.id }) : go('rootcause', { tab: 'issue', key: sel.model + '|' + sel.comp }))}>Open root cause</button>}>
            {dq.error && <ErrorBox msg={dq.error} />}
            {!x && !dq.error && <Loading />}
            {x && <Detail x={x} />}
          </Panel>
        )}
        <Panel title="Size against speed" sub="Right: rising fastest. Up: costing most. Bubble size is claim count. The dashed line is the alert threshold." span={6} charts={[bub]}><Chart desc={bub} height={320} /></Panel>
        <Panel title="Where the rate is above expected" sub="Times the expected claim rate, by model and component. Only flagged pairs are filled." span={6} charts={[heat]}><Chart desc={heat} height={320} /></Panel>
        <Panel title="Weekly claims" sub="Claims that belong to a detected pattern against all others." span={6} charts={[wk]}><Chart desc={wk} height={260} /></Panel>
        <Panel title="What warns first" sub="Days of warning before the warranty claim, by issue. Drift is an estimate from the indicator model; the fault-code lead is the measured median." span={6} charts={[ord]} facts={['Claims themselves arrive after the failure, often with a delay before they are filed.']}><Chart desc={ord} height={260} /></Panel>
      </div>
    </>
  );
}
function Detail({ x }: { x: any }) {
  const wk = C.bar(x.weekly.x, [['Claims a week', x.weekly.counts]], { u: 'claims' });
  const cu = C.line(x.weekly.x, [['CUSUM', x.weekly.cusum, { area: 1 }]], { u: 'CUSUM', marks: [['Signal at 4', 4, 'crit']] });
  const mis = C.line(x.mis.x, [...(x.mis.inRule ? [['Affected group', x.mis.inRule] as any] : []), ['Rest of the model', x.mis.rest, { dash: 1 }]], { u: 'claims per 1,000', xn: 'Months in service' });
  const tile = C.tile(x.tile, { u: '% of vehicles with a claim', hi: 'More', lo: 'Fewer' });
  const cw = C.bar(x.codeWeekly.x, [['Fault-code events a week', x.codeWeekly.v]], { u: 'events' });
  const dr = C.bar(x.drift.map((r: any) => r[0]), [['Failed or affected vehicles', x.drift.map((r: any) => r[1])], ['Rest of the model', x.drift.map((r: any) => r[2])]], { u: 'SD from typical', horiz: 1 });
  return (
    <div className="stack">
      <Facts items={[['Claims to date', fmt(x.kpis.claims)], ['Cost to date', inr(x.kpis.cost)], ['Vehicles with a claim', x.kpis.share + '% of the model'], ['No-fault-found', x.kpis.nff + '%'], ['Average months in service at failure', x.kpis.avgMis], ['Case', x.issue ? x.issue.id + ' · ' + x.issue.status : 'None yet']]} />
      {x.rule && <Note><b>Affected group found from the data:</b> {x.rule.text}. {fmt(x.rule.w)} vehicles; {x.rule.rate}% have failed; this group holds {x.rule.cover}% of all failures.</Note>}
      <div className="g12">
        <Panel title="Claims a week, last 52 weeks" span={6} charts={[wk]}><Chart desc={wk} height={220} /></Panel>
        <Panel title="When the rate started to move" sub={x.weekly.cross ? `The CUSUM crossed the signal line in the week of ${x.weekly.cross}.` : 'The CUSUM has not crossed the signal line: the rate is steady or the issue is older than a year.'} span={6} charts={[cu]}><Chart desc={cu} height={220} /></Panel>
        <Panel title="What the failed vehicles share" sub="Ranked by how strongly each factor separates failed from healthy vehicles. Build-date factors are not adjusted for time in service." span={6} data={x.factors}><FactorList factors={x.factors} max={8} /></Panel>
        <Panel title="Claims by months in service" sub="Cumulative claims per 1,000 vehicles old enough to have reached each month." span={6} charts={[mis]}><Chart desc={mis} height={280} /></Panel>
        <Panel title="Fault codes on this component" sub="Events a week, last 26 weeks. Codes usually move before claims." span={4} charts={[cw]} facts={x.codes.map((r: any) => `${r[0]} ${r[1]}: ${r[2]} vehicles`)}><Chart desc={cw} height={230} /></Panel>
        <Panel title="Health indicators" sub="Average distance from typical, in standard deviations on the bad side." span={4} charts={[dr]}><Chart desc={dr} height={230} /></Panel>
        <Panel title="Where the failures are" span={4} charts={[tile]}><Chart desc={tile} height={230} /></Panel>
      </div>
      <DataTable csv="claims.csv" max="300px" columns={['Claim', 'Date', 'VIN', 'City', 'Months in service', 'Odometer', 'Symptom', 'No-fault-found', 'Cost, Rs']} rows={x.claims} />
    </div>
  );
}

function Dtc({ c }: { c: CohortValue }) {
  const { go } = useApp();
  const [code, setCode] = useState(urlParam('code'));
  const q = useQuery(() => ds.fetchDtc(c), [JSON.stringify(c)]);
  const cq = useQuery(() => (code ? ds.fetchDtcCode({ code }) : Promise.resolve(null)), [code]);
  const d: any = q.data, x: any = cq.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis;
  const wk = C.bar(d.weekly.x, d.weekly.crit, { stack: 1, u: 'vehicles with a code', scols: ['c8', 'c2', 'c4', 'c1'] });
  const heat = C.heat(d.heat.x, d.heat.y, d.heat.d, { u: 'vehicles per 1,000 in 90 days', lab: 1, hi: 'More', lo: 'Fewer' });
  const sys = C.bar(d.bySys.map((r: any) => r[0]), [['Events in 30 days', d.bySys.map((r: any) => r[1])]], { horiz: 1, lab: 1, u: 'events' });
  const sw = C.bar(d.bySw.map((r: any) => r[0]), [['Events per 1,000 vehicles on that version', d.bySw.map((r: any) => r[1])]], { lab: 1, u: 'per 1,000' });
  const ph = C.donut(d.ctx.phase);
  const soc = C.bar(d.ctx.soc.map((r: any) => r[0]), [['Events', d.ctx.soc.map((r: any) => r[1])]], { u: 'events' });
  const tp = C.bar(d.ctx.temp.map((r: any) => r[0]), [['Events', d.ctx.temp.map((r: any) => r[1])]], { u: 'events' });
  const tile = C.tile(d.tile, { u: 'vehicles with a code per 1,000, 30 days', hi: 'More', lo: 'Fewer' });
  return (
    <>
      <Kpis items={[{ label: 'Vehicles with a code, 30 days', value: fmt(k.vehicles), note: `${k.share}% of the selection` }, { label: 'Code events, 30 days', value: fmt(k.events) }, { label: 'Vehicles with an active code', value: fmt(k.active) }, { label: 'Active critical codes', value: fmt(k.critical), note: 'Stop-drive advice applies' }, { label: 'Distinct codes seen', value: k.codes }, { label: 'Codes spreading', value: k.spreading, note: 'Up 1.8 times or more in 30 days' }]} />
      <div className="g12">
        <Panel title="Fault codes" sub="Vehicles setting each code. Ratio compares the last 30 days with the 90 days before. Select a code for its detail." span={12} data={d.codes.slice(0, 25)}>
          <DataTable csv="fault-codes.csv" max="400px" columns={['Code', 'Definition', 'Component', 'Criticality', 'Vehicles, 400 days', 'Vehicles, 30 days', 'Active now', 'Against prior period', 'Trend', 'Known sequence of']}
            rows={d.codes.map((r: any) => [r.code, r.def, r.comp, r.crit, r.vehicles, r.v30, r.active, r.ratio + 'x', r.spark, r.issue || ''])}
            render={(v, j) => (j === 8 ? <Sparkline v={v} /> : j === 3 ? <Sev s={v} /> : undefined)} onRow={(r) => setCode(r[0])} sel={d.codes.findIndex((r: any) => r.code === code)} />
        </Panel>
        {code && (
          <Panel title={x ? `${x.code}: ${x.def}` : 'Loading code'} sub={x ? `${x.sys} · ${x.part} · ${x.mode}` : ''} span={12} noAi tools={x && x.issue && <button className="btn pri small" onClick={() => go('rootcause', { tab: 'issue', id: x.issue.id })}>Open {x.issue.id}</button>}>
            {cq.error && <ErrorBox msg={cq.error} />}
            {!x && !cq.error && <Loading />}
            {x && <CodeDetail x={x} />}
          </Panel>
        )}
        <Panel title="Vehicles with a code, by week" sub="By criticality, last 26 weeks." span={7} charts={[wk]}><Chart desc={wk} height={270} /></Panel>
        <Panel title="By system" span={5} charts={[sys]}><Chart desc={sys} height={270} /></Panel>
        <Panel title="Code by model" sub="Vehicles per 1,000 that set the code in 90 days. A code concentrated on one model is a lead." span={7} charts={[heat]}><Chart desc={heat} height={380} /></Panel>
        <Panel title="By software version" sub="Events per 1,000 vehicles on each version, 30 days." span={5} charts={[sw]}><Chart desc={sw} height={380} /></Panel>
        <Panel title="Code sequences" sub="Code B first seen within 45 days after code A on the same vehicle. A repeatable chain is a precursor: the first code predicts the last." span={12} data={d.sequences}>
          <DataTable csv="code-sequences.csv" columns={['First code', 'Then', 'Vehicles', 'Share of vehicles with the first code', 'Median gap, days', 'Second code means', 'Criticality']} rows={d.sequences.map((r: any) => [r[0], r[1], r[2], r[3] + '%', r[4], r[5], r[6]])} render={(v, j) => (j === 6 ? <Sev s={v} /> : undefined)} />
        </Panel>
        <Panel title="When codes are set" span={3} charts={[ph]}><Chart desc={ph} height={220} /></Panel>
        <Panel title="State of charge at the event" span={3} charts={[soc]}><Chart desc={soc} height={220} /></Panel>
        <Panel title="Ambient temperature at the event" span={3} charts={[tp]}><Chart desc={tp} height={220} /></Panel>
        <Panel title="By state" span={3} charts={[tile]}><Chart desc={tile} height={220} /></Panel>
        <Panel title="Latest events" sub="Most recent 150 in the selection, with freeze-frame context." span={12} noAi>
          <DataTable csv="fault-code-events.csv" max="340px" columns={['Date', 'VIN', 'Model', 'Code', 'Definition', 'Criticality', 'State', 'Count', 'Phase', 'Charge %', 'Ambient °C', 'Odometer']} rows={d.records} render={(v, j) => (j === 5 ? <Sev s={v} /> : undefined)} />
        </Panel>
      </div>
    </>
  );
}
function CodeDetail({ x }: { x: any }) {
  const wk = C.bar(x.weekly.x, [['Vehicles a week', x.weekly.v]], { u: 'vehicles' });
  const bm = C.bar(x.byModel.map((r: any) => r[0]), [['Vehicles', x.byModel.map((r: any) => r[1])]], { lab: 1, u: 'vehicles' });
  return (
    <div className="stack">
      <Facts items={[['Criticality', x.crit], ['Vehicles, 400 days', fmt(x.kpis.vehicles)], ['Followed by a claim', x.kpis.claimShare + '% of vehicles'], ['Median days from first code to claim', x.kpis.medGap ?? 'n/a'], ['Known sequence', x.issue ? `${x.issue.id}, step ${x.issue.step} of ${x.issue.of}` : 'None'], ['Most often followed by a claim on', x.comps[0] ? x.comps[0][0] : 'n/a']]} />
      <div className="two">
        <div className="prose" style={{ maxWidth: 'none' }}>
          <div><b>What the vehicle does.</b> {x.does}</div><div><b>What the customer notices.</b> {x.notices}</div><div><b>Likely causes.</b> {x.causes}</div><div><b>Workshop check.</b> {x.check}</div><div><b>Remedy.</b> {x.fix}</div><div><b>Typical parts.</b> {x.parts}</div>
        </div>
        <div className="stack">
          <Panel title="Vehicles setting the code, by week" span={12} charts={[wk]}><Chart desc={wk} height={180} /></Panel>
          <Panel title="By model" span={12} charts={[bm]}><Chart desc={bm} height={170} /></Panel>
        </div>
      </div>
      <div className="two">
        <div><h4>What vehicles with this code share</h4><FactorList factors={x.factors} /></div>
        <DataTable max="260px" columns={['VIN', 'Model', 'City', 'Software', 'Events', 'Last seen', 'Has a claim']} rows={x.vehicles} />
      </div>
    </div>
  );
}

function Drift({ c }: { c: CohortValue }) {
  const [kpi, setKpi] = useState('');
  const q = useQuery(() => ds.fetchDrift({ ...c, kpi }), [JSON.stringify(c), kpi]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const heat = C.heat(d.heat.x, d.heat.y, d.heat.d, { u: '% of vehicles beyond 2.5 SD', lab: 1, hi: 'More drifting', lo: 'None' });
  const x = d.detail;
  const hist = x && C.hist(x.bins, x.drift, x.all, { u: x.unit, an: 'Drifting vehicles' });
  return (
    <>
      <Kpis items={[{ label: 'Health indicators watched', value: d.kpis.indicators }, { label: 'Indicators with a drifting group', value: d.kpis.drifting }, { label: 'Vehicles with at least one indicator far out', value: fmt(d.kpis.vehicles) }, { label: 'Of those, with no claim yet', value: d.kpis.noClaim + '%', note: 'The earliest window to act' }]} />
      <Note>Signal drift looks for vehicles whose component health indicator sits more than 2.5 standard deviations on the bad side of their peers. It fires before a fault code is set and long before a claim.</Note>
      <div className="g12">
        <Panel title="Drifting indicators" sub="Select a row to see its distribution and the vehicles." span={7} data={d.rows.slice(0, 20)}>
          <DataTable csv="signal-drift.csv" max="430px" columns={['Indicator', 'Component', 'Bad direction', 'Vehicles beyond 2.5 SD', 'Share of selection', 'No claim yet', 'Most affected model', 'Share on that model']} rows={d.rows.map((r: any) => [r.name, r.comp, r.dir, r.n, r.share + '%', r.noClaim + '%', r.model, r.modelShare + '%'])} onRow={(_, i) => setKpi(d.rows[i].key)} sel={x ? d.rows.findIndex((r: any) => r.key === x.key) : undefined} />
        </Panel>
        <Panel title="Indicator by model" sub="Share of vehicles beyond 2.5 SD. A filled cell on one model points to a model-specific cause." span={5} charts={[heat]}><Chart desc={heat} height={430} /></Panel>
        {x && (
          <>
            <Panel title={`${x.name}: drifting vehicles against everyone`} sub={`${x.desc}. Median ${x.median} ${x.unit}.`} span={6} charts={[hist]} facts={['What the drifting vehicles share: ' + x.rule]}><Chart desc={hist} height={280} /><div className="small"><b>What the drifting vehicles share:</b> {x.rule}</div></Panel>
            <Panel title="Vehicles furthest out" sub="Select a VIN for vehicle information and the failure report." span={6} noAi>
              <DataTable csv="drifting-vehicles.csv" max="320px" columns={['VIN', 'Model', 'City', x.name + ', ' + x.unit, 'SD on the bad side', 'Codes, 90 days', 'Claim already', 'Failure in 90 days']} rows={x.vehicles} />
            </Panel>
          </>
        )}
      </div>
    </>
  );
}

function Launch() {
  const { go } = useApp();
  const [model, setModel] = useState('');
  const q = useQuery(() => ds.fetchLaunch({ model }), [model]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis;
  const mis = C.line(d.mis.x, [[d.name, d.mis.cur], [d.pre + ' at the same age', d.mis.pre, { dash: 1 }], ['Target', d.mis.target, { dash: 1 }]], { u: 'claims per 1,000', xn: 'Months in service' });
  const bld = C.bar(d.build.x, [['Claims per 1,000 at two months in service', d.build.v]], { lab: 1, u: 'per 1,000' });
  const cmp = C.bar(d.comps.map((r: any) => r[0]), [[d.name, d.comps.map((r: any) => r[1])], [d.pre, d.comps.map((r: any) => r[2])]], { u: 'claims per 1,000 vehicles', horiz: 1 });
  const pl = C.bar(d.plant.map((r: any) => r[0]), [['Claims per 1,000', d.plant.map((r: any) => r[1])]], { lab: 1, horiz: 1, u: 'per 1,000' });
  return (
    <>
      <div className="pbar noprint"><Select label="Launch model" value={d.model} onChange={setModel} options={d.models} all={null} /><span className="small muted">Compared with {d.pre}. {d.months} months since start of production.</span></div>
      <Kpis items={[{ label: 'Built', value: fmt(k.built) }, { label: 'In service', value: fmt(k.inService) }, { label: 'Claims so far', value: fmt(k.claims), note: inr(k.cost) }, { label: 'Claims per 1,000 at the latest month measured', value: k.r3 ?? d.mis.cur.filter((v: any) => v !== null).pop(), note: `${d.pre}: ${k.pre3} at three months` }, { label: 'Vehicles with a code in first 30 days', value: k.early + '%' }, { label: 'Open issues', value: k.open }]} />
      <div className="g12">
        <Panel title="Launch gates" sub="The checks a launch review looks at each week." span={5} data={d.gates}>
          <DataTable columns={['Gate', 'Now', 'Target', 'State']} rows={d.gates.map((g: any) => [g[0], g[1] ?? 'Too early', g[2], g[1] === null ? 'Too early to measure' : g[1] <= g[2] ? 'Met' : 'Not met'])} render={(v, j) => (j === 3 ? <span className={'pill ' + (v === 'Met' ? 'g' : v === 'Not met' ? 'r' : 'n')}>{v}</span> : undefined)} />
        </Panel>
        <Panel title="Claims by months in service" sub="Points appear only once enough vehicles have reached that age." span={7} charts={[mis]}><Chart desc={mis} height={280} /></Panel>
        <Panel title="By build month" sub="Is each month of production better than the last?" span={6} charts={[bld]}><Chart desc={bld} height={250} /></Panel>
        <Panel title="By component, against the predecessor" span={6} charts={[cmp]}><Chart desc={cmp} height={250} /></Panel>
        <Panel title="Launch issues" sub="Select a row to open the issue analysis." span={8} data={d.issues}>
          <DataTable columns={['Issue', 'Name', 'Status', 'Cause type', 'Vehicles affected', 'Claims', 'Expected failures, 90 days', 'Action']} rows={d.issues} render={(v, j) => (j === 2 ? <StatusBadge status={v} /> : undefined)} onRow={(r) => go('rootcause', { tab: 'issue', id: r[0] })} />
        </Panel>
        <Panel title="By line and shift" span={4} charts={[pl]}><Chart desc={pl} height={230} /></Panel>
        <Panel title="Most frequent fault codes" span={12} data={d.codes}><DataTable columns={['Code', 'Definition', 'Vehicles']} rows={d.codes} /></Panel>
      </div>
    </>
  );
}

export default function EarlyWarning() {
  const [tab, setTab] = useState(urlParam('tab') || 'claims');
  const [c, setC] = useState<CohortValue>({});
  return (
    <div className="stack">
      <SuiteHead art="analysis" eyebrow="Detect" title="Early warning" sub="Finds emerging field issues before they become expensive. Warranty claims are the confirmed signal; fault codes, health-indicator drift and predictions fire earlier and are shown alongside. Each flagged pattern comes with the vehicles that share it. Demo data." />
      <Tabs tabs={[['claims', 'Emerging issues'], ['dtc', 'Fault code analytics'], ['drift', 'Signal drift'], ['launch', 'Launch monitor']]} value={tab} onChange={setTab} />
      {tab !== 'launch' && <CohortBar value={c} onChange={setC} show={['seg', 'model', 'zone', 'state', 'plant', 'usage', 'buildY', 'comp']} />}
      {tab === 'claims' && <Claims c={c} />}
      {tab === 'dtc' && <Dtc c={c} />}
      {tab === 'drift' && <Drift c={c} />}
      {tab === 'launch' && <Launch />}
    </div>
  );
}
