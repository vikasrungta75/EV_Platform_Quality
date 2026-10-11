'use client';
// Predictive failure: which components will fail, on which vehicles, within 30, 60 and 90 days; fault-code and parts forecasts; model report.
import { useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Chart from '@/components/Chart';
import CohortBar, { CohortValue, useFilters } from '@/components/CohortBar';
import Panel from '@/components/Panel';
import { DataTable, ErrorBox, Kpis, Loading, Note, Select, Sev, StatusBadge, Tabs, fmt, inr } from '@/components/ui';
import { chart as C } from '@/lib/charts';
import { urlParam } from '@/lib/hooks';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';

const DEMO = 'Predictions here are generated to show what a trained model would output. They are not a working model.';

function Outlook({ c }: { c: CohortValue }) {
  const { go } = useApp();
  const [h, setH] = useState('90');
  const q = useQuery(() => ds.fetchPredOverview({ ...c, h }), [JSON.stringify(c), h]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis, bc = d.byComp.slice(0, 12);
  const comp = C.bar(bc.map((r: any) => r.name), [['From a known issue', bc.map((r: any) => r.issue)], ['Anomaly, no known cause', bc.map((r: any) => r.anomaly)], ['Wear and age', bc.map((r: any) => r.wear)]], { stack: 1, horiz: 1, u: 'expected failures' });
  const wk = C.line(d.weekly.x, [['Failures from known patterns, last 13 weeks', d.weekly.past], ['Forecast, next 13 weeks', d.weekly.future, { dash: 1 }]], { u: 'failures a week', noEnd: 1 });
  const ttf = C.bar(d.ttf.map((r: any) => r[0]), [['Vehicles', d.ttf.map((r: any) => r[1])]], { lab: 1, u: 'vehicles' });
  const tile = C.tile(d.tile, { u: 'expected failures per 1,000 vehicles', hi: 'More', lo: 'Fewer' });
  const sc = C.scat(d.scatter, { xn: 'Expected days to failure', yn: 'Chance of failure in 90 days, %', hline: 50, ml: '', cols: ['c8', 'c1'] });
  const dr = C.bar(d.byDriver.map((r: any) => r[0]), [['Expected failures', d.byDriver.map((r: any) => r[1])]], { horiz: 1, lab: 1, u: 'failures' });
  const seg = C.bar(d.bySeg.map((r: any) => r[0]), [['Expected failures per 1,000 vehicles', d.bySeg.map((r: any) => r[2])]], { lab: 1, u: 'per 1,000' });
  const vr = C.bar(d.vehicleRisk.map((r: any) => r[0]), [['Vehicles', d.vehicleRisk.map((r: any) => r[1])]], { lab: 1, u: 'vehicles' });
  return (
    <>
      <div className="pbar noprint"><div className="chips">{['30', '60', '90'].map((x) => <button key={x} className="btn small" aria-pressed={h === x} onClick={() => setH(x)}>Next {x} days</button>)}</div><span className="small muted">{DEMO}</span></div>
      <Kpis items={[{ label: `Vehicles more likely than not to fail in ${d.horizon} days`, value: fmt(k.n50), note: `${fmt(k.high)} with high confidence` }, { label: 'Expected failures', value: fmt(k.expected), note: 'From known issues and anomalies' }, { label: 'Expected claim cost', value: inr(k.cost) }, { label: 'Vehicles at breakdown risk above 30%', value: fmt(k.stop), note: `${k.stopShare}% of the selection; any component that stops the vehicle` }, { label: 'Safety-critical components at risk', value: fmt(k.safety), note: 'Vehicles above 50%' }]} />
      <div className="g12">
        <Panel title="Expected failures by component" sub="What will fail, and whether the cause is known." span={7} charts={[comp]}><Chart desc={comp} height={360} onClick={(p: any) => { const r = bc.find((x: any) => x.name === p.name); if (r) go('predict', { tab: 'vehicles', comp: r.comp }); }} /></Panel>
        <Panel title="Expected failures by cause" span={5} charts={[dr]}><Chart desc={dr} height={360} /></Panel>
        <Panel title="Failures a week: recent and forecast" sub="Forecast places each at-risk vehicle in the week it is expected to fail." span={7} charts={[wk]}><Chart desc={wk} height={270} /></Panel>
        <Panel title="When they are expected to fail" sub="Vehicles with at least a 30% chance in 90 days." span={5} charts={[ttf]}><Chart desc={ttf} height={270} /></Panel>
        <Panel title="Probability against time to failure" sub="Each dot is a vehicle and component. Top left needs action first. Red dots are safety-critical components." span={7} charts={[sc]}><Chart desc={sc} height={320} /></Panel>
        <Panel title="Where failures are expected" span={5} charts={[tile]}><Chart desc={tile} height={320} /></Panel>
        <Panel title="Whole-vehicle breakdown risk" sub="Chance that any component which stops the vehicle fails in the horizon." span={4} charts={[vr]}><Chart desc={vr} height={230} /></Panel>
        <Panel title="By segment" span={4} charts={[seg]}><Chart desc={seg} height={230} /></Panel>
        <Panel title="Parts demand" sub="Expected replacements in the horizon; order ahead of the failures." span={4} data={d.byComp}>
          <DataTable csv="parts-demand.csv" max="230px" columns={['Component', 'Parts expected', 'Vehicles above 50%', 'Cost, Rs crore']} rows={d.byComp.map((r: any) => [r.name, r.parts, r.n50, +(r.cost / 1e7).toFixed(2)])} />
        </Panel>
      </div>
    </>
  );
}
function Vehicles({ c }: { c: CohortValue }) {
  const f = useFilters();
  const [p, setP] = useState<any>({ comp: urlParam('comp'), issueId: urlParam('issueId'), band: '', safety: '', driver: '', model: urlParam('model'), page: 1 });
  const q = useQuery(() => ds.fetchPredVehicles({ ...c, ...p, model: c.model || p.model }), [JSON.stringify(c), JSON.stringify(p)]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const bands = C.bar(d.bands.map((b: any) => b[0]), [['Vehicles', d.bands.map((b: any) => b[1])]], { lab: 1, u: 'vehicles', cols: ['c8', 'c2', 'c4', 'c1', 'c7'] });
  return (
    <>
      <div className="pbar noprint">
        <Select label="Component" value={p.comp} onChange={(v) => setP({ ...p, comp: v, page: 1 })} options={f ? f.comps : []} />
        <Select label="Issue" value={p.issueId} onChange={(v) => setP({ ...p, issueId: v, page: 1 })} options={f ? f.issues : []} />
        <Select label="Priority" value={p.band} onChange={(v) => setP({ ...p, band: v, page: 1 })} options={['Now', 'Within 30 days', 'Within 60 days', 'Within 90 days', 'Monitor']} />
        <Select label="Cause" value={p.driver} onChange={(v) => setP({ ...p, driver: v, page: 1 })} options={[['issue', 'Known issue'], ['anomaly', 'Anomaly'], ['wear', 'Wear and age']]} />
        <Select label="Safety critical" value={p.safety} onChange={(v) => setP({ ...p, safety: v, page: 1 })} options={[['1', 'Only safety critical']]} />
      </div>
      <div className="g12">
        <Panel title="By priority" sub="Now: more likely than not within 30 days." span={4} charts={[bands]}><Chart desc={bands} height={240} onClick={(x: any) => setP({ ...p, band: x.name, page: 1 })} /></Panel>
        <Panel title={`Vehicles at risk: ${fmt(d.weighted)}`} sub={`Demo shows sampled vehicles; ${d.total} rows stand for ${fmt(d.weighted)} vehicles. Highest risk first. Select a VIN for the failure report.`} span={8} data={d.rows.slice(0, 20).map((r: any) => [r.vin, r.comp, r.p, r.ttf, r.driver])}>
          <DataTable csv="vehicles-at-risk.csv" max="520px" columns={['VIN', 'Model', 'City', 'Component', '30 days', '60 days', '90 days', 'Days to failure', 'Priority', 'Cause', 'Confidence', 'Evidence']}
            rows={d.rows.map((r: any) => [r.vin, r.model, r.city, r.comp + (r.safety ? ' (safety)' : ''), r.p[0] + '%', r.p[1] + '%', r.p[2] + '%', r.ttf, r.band, r.driver, r.conf, r.evid.join('. ')])} render={(v, j) => (j === 8 ? <StatusBadge status={v} /> : undefined)} />
          <div className="row noprint"><button className="btn small" disabled={d.page <= 1} onClick={() => setP({ ...p, page: d.page - 1 })}>Previous</button><span className="small muted">Page {d.page} of {Math.max(1, Math.ceil(d.total / d.size))}</span><button className="btn small" disabled={d.page * d.size >= d.total} onClick={() => setP({ ...p, page: d.page + 1 })}>Next</button></div>
        </Panel>
      </div>
    </>
  );
}
function Codes({ c }: { c: CohortValue }) {
  const q = useQuery(() => ds.fetchPredDtc(c), [JSON.stringify(c)]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis;
  const ch = C.line(d.chart.x, d.chart.series.flatMap((s: any) => [[s[0], s[1]], [s[0] + ' forecast', s[2], { dash: 1 }]]), { u: 'vehicles a week', noEnd: 1 });
  const bn = C.bar(d.byNext.map((r: any) => r[0]), [['Vehicles expected to set it', d.byNext.map((r: any) => r[1])]], { horiz: 1, lab: 1, u: 'vehicles' });
  return (
    <>
      <Kpis items={[{ label: 'Codes forecast to rise 25% or more', value: k.rising }, { label: 'Vehicles expected to set a code, 4 weeks', value: fmt(k.next4) }, { label: 'Vehicles expected to set the next code in a sequence', value: fmt(k.nextVehicles) }, { label: 'Of those, a critical code', value: fmt(k.critical) }]} />
      <div className="g12">
        <Panel title="Fault-code forecast" sub="Vehicles setting each code a week: 13 weeks of history and a four-week forecast from the recent trend. Top five codes." span={7} charts={[ch]}><Chart desc={ch} height={320} /></Panel>
        <Panel title="Next code expected" sub="Vehicles that have set one code in a known sequence and are expected to set the next." span={5} charts={[bn]}><Chart desc={bn} height={320} /></Panel>
        <Panel title="Forecast by code" span={12} data={d.codes.slice(0, 20)}>
          <DataTable csv="code-forecast.csv" max="340px" columns={['Code', 'Definition', 'Component', 'Criticality', 'Vehicles, last 4 weeks', 'Forecast, next 4 weeks', 'Change']} rows={d.codes.map((r: any) => [r.code, r.def, r.comp, r.crit, r.last4, r.next4, r.change === null ? '' : (r.change > 0 ? '+' : '') + r.change + '%'])} render={(v, j) => (j === 3 ? <Sev s={v} /> : undefined)} />
        </Panel>
        <Panel title="Vehicles about to set the next code" sub="Soonest first. The vehicle already shows the earlier code in the sequence." span={12} data={d.next.slice(0, 20)}>
          <DataTable csv="next-code.csv" max="380px" columns={['VIN', 'Model', 'City', 'Has', 'Next expected', 'Definition', 'Criticality', 'In about, days', 'Chance', 'Issue']} rows={d.next.map((r: any) => [r.vin, r.model, r.city, r.has, r.next, r.def, r.crit, r.days, r.p + '%', r.issue])} render={(v, j) => (j === 6 ? <Sev s={v} /> : undefined)} />
        </Panel>
      </div>
    </>
  );
}
function Model() {
  const q = useQuery(() => ds.fetchPredModel(), []);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const a = d.all;
  const gain = C.line(d.gain.map((g: any) => g[0] + '%'), [['Failures reached', d.gain.map((g: any) => g[1])], ['If vehicles were picked at random', d.gain.map((g: any) => g[0]), { dash: 1 }]], { u: '% of failures within 90 days', xn: 'Share of at-risk vehicles called in, highest risk first' });
  const cal = C.bar(d.cal.map((r: any) => r[0]), [['Share that actually failed within 90 days', d.cal.map((r: any) => r[1])]], { lab: 1, u: '%', max: 100 });
  const imp = C.bar(d.imp.map((r: any) => r[0]), [['Separation', d.imp.map((r: any) => r[1])]], { horiz: 1, lab: 1, u: 'separation between vehicles that fail and those that do not' });
  return (
    <>
      <Note>{d.note}</Note>
      <Kpis items={[{ label: 'Vehicle and issue pairs scored', value: fmt(a.n) }, { label: 'Fail within 90 days', value: a.positives }, { label: 'Precision at 50%', value: a.precision + '%', note: 'Flagged vehicles that do fail' }, { label: 'Recall at 50%', value: a.recall + '%', note: 'Failures that were flagged' }, { label: 'Error in days to failure', value: a.mae, unit: 'days', note: 'Mean absolute, on vehicles that fail' }]} />
      <div className="g12">
        <Panel title="Gain" sub="How many of the coming failures are reached by calling in the highest-risk vehicles first." span={6} charts={[gain]}><Chart desc={gain} height={300} /></Panel>
        <Panel title="Calibration" sub="When the estimate says 70 to 80%, how many fail? A well-calibrated estimate follows the labels." span={6} charts={[cal]}><Chart desc={cal} height={300} /></Panel>
        <Panel title="What carries the signal" span={5} charts={[imp]}><Chart desc={imp} height={250} /></Panel>
        <Panel title="By issue" span={7} data={d.per}><DataTable csv="model-by-issue.csv" columns={['Issue', 'Name', 'Vehicles scored', 'Fail within 90 days', 'Precision %', 'Recall %', 'Days-to-failure error']} rows={d.per} /></Panel>
      </div>
    </>
  );
}
export default function Predictive() {
  const [tab, setTab] = useState(urlParam('tab') || 'outlook');
  const [c, setC] = useState<CohortValue>({});
  return (
    <div className="stack">
      <SuiteHead art="reliability" eyebrow="Predict and act" title="Predictive failure" sub="For every vehicle and component: the chance of failure within 30, 60 and 90 days, the expected days to failure and the evidence. Also whole-vehicle breakdown risk, fault-code forecasts and parts demand. Demo data." />
      <Tabs tabs={[['outlook', 'Fleet outlook'], ['vehicles', 'Vehicles at risk'], ['codes', 'Fault-code forecast'], ['model', 'Model report']]} value={tab} onChange={setTab} />
      {tab !== 'model' && <CohortBar value={c} onChange={setC} show={['seg', 'model', 'zone', 'state', 'usage', 'buildY']} />}
      {tab === 'outlook' && <Outlook c={c} />}
      {tab === 'vehicles' && <Vehicles c={c} />}
      {tab === 'codes' && <Codes c={c} />}
      {tab === 'model' && <Model />}
    </div>
  );
}
