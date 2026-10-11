'use client';
// Supplier and plant quality: field failures traced upstream to supplier lots and to plant line, shift and station; containment.
import { useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Chart from '@/components/Chart';
import CohortBar, { CohortValue, useFilters } from '@/components/CohortBar';
import Panel from '@/components/Panel';
import { DataTable, ErrorBox, Facts, Kpis, Loading, Note, Select, StatusBadge, Tabs, fmt, inr } from '@/components/ui';
import { chart as C } from '@/lib/charts';
import { urlParam } from '@/lib/hooks';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';

const cr = (n: number) => +(n / 1e7).toFixed(2);
function Suppliers({ c }: { c: CohortValue }) {
  const [lot, setLot] = useState<any>(null);
  const q = useQuery(() => ds.fetchSupOverview(c), [JSON.stringify(c)]);
  const lq = useQuery(() => (lot ? ds.fetchSupLot(lot) : Promise.resolve(null)), [JSON.stringify(lot)]);
  const d: any = q.data, x: any = lq.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis;
  const pair = C.bar(d.pair.x, [['Higher of the two suppliers', d.pair.a], ['Lower of the two suppliers', d.pair.b]], { horiz: 1, u: 'claims per 1,000 vehicles a year' });
  const sk = d.sankey.links.length > 0 && C.sankey(d.sankey.nodes, d.sankey.links);
  return (
    <>
      <Kpis items={[{ label: 'Suppliers', value: k.suppliers }, { label: 'Component supplies graded D', value: k.gradeD, note: '2.5 times the other supplier or more' }, { label: 'Lots standing out', value: k.lots, note: '3 times sibling lots or more' }, { label: 'Claims cost, 12 months', value: inr(k.cost) }, { label: 'Tied to a supplier-responsible issue', value: k.linked + '%' }]} />
      <div className="g12">
        <Panel title="Supplier scorecard" sub="Grade compares each supplier with the other supplier of the same component, so components are judged like for like." span={12} data={d.rows.slice(0, 25)}>
          <DataTable csv="supplier-scorecard.csv" max="400px" columns={['Supplier', 'Component', 'Vehicles fitted', 'Claims, 12 months', 'Per 1,000 a year', 'Against the other supplier', 'Grade', 'Cost, Rs crore', 'No-fault-found %', 'Recovered %', 'Open alerts', 'Issues']} rows={d.rows.map((r: any) => [r.supplier, r.compName, r.fitted, r.claims, r.rate, r.vs ? r.vs + 'x' : '', r.grade, cr(r.cost), r.nff, r.recov, r.alerts, r.issues])} render={(v, j) => (j === 6 ? <span className={'pill ' + (v === 'D' ? 'r' : v === 'C' ? 'a' : v === 'A' ? 'g' : 'n')}>{v}</span> : undefined)} />
        </Panel>
        <Panel title="The two suppliers of each component" sub="A wide gap on one component is a supplier lead; a narrow one points elsewhere." span={sk ? 6 : 12} charts={[pair]}><Chart desc={pair} height={420} /></Panel>
        {sk && <Panel title="Supplier to component to issue" sub="Claims cost tied to supplier-responsible issues, Rs crore." span={6} charts={[sk]}><Chart desc={sk} height={420} /></Panel>}
        <Panel title="Lots that stand out" sub="Lots whose vehicles fail at least three times as often as sibling lots of the same component and model. Select a lot to trace it." span={12} data={d.lots.slice(0, 20)}>
          <DataTable csv="suspect-lots.csv" max="360px" columns={['Lot', 'Supplier', 'Component', 'Model', 'Vehicles', 'Failed %', 'Sibling lots %', 'Times', 'Strength', 'Unsold', 'Issue']} rows={d.lots.map((r: any) => [r.lot, r.supplier, r.compName, r.model, r.vehicles, r.failed, r.rest, r.ratio, r.z, r.stock, r.issue])} onRow={(_, i) => setLot({ comp: d.lots[i].comp, lot: d.lots[i].lot })} sel={lot ? d.lots.findIndex((r: any) => r.lot === lot.lot && r.comp === lot.comp) : undefined} />
        </Panel>
        {lot && (
          <Panel title={x ? `Lot ${x.lot}: ${x.comp} from ${x.supplier}` : 'Tracing lot'} sub={x ? `Fitted to ${x.models}.` : ''} span={12} noAi>
            {lq.error && <ErrorBox msg={lq.error} />}{!x && !lq.error && <Loading />}
            {x && <LotDetail x={x} />}
          </Panel>
        )}
      </div>
    </>
  );
}
function LotDetail({ x }: { x: any }) {
  const mis = C.line(x.mis.x, [['This lot', x.mis.lot], ['Sibling lots', x.mis.sib, { dash: 1 }]], { u: 'claims per 1,000', xn: 'Months in service' });
  const adj = C.bar(x.adjacent.map((r: any) => r[0]), [['Vehicles failed, %', x.adjacent.map((r: any) => r[1])]], { u: '%', cols: x.adjacent.map((r: any) => (r[0] === x.lot ? 'c8' : 'c1')) });
  const wh = C.donut(x.where.filter((r: any) => r[1] > 0));
  return (
    <div className="stack">
      <Facts items={[['Vehicles carrying the lot', fmt(x.kpis.vehicles)], ['Failed so far', x.kpis.failed + '%'], ['Sibling lots', x.kpis.sibling + '%'], ['More failures expected, 90 days', fmt(x.kpis.e90)], ['Claims cost', inr(x.kpis.cost)], ['Unsold vehicles', fmt(x.kpis.stock)]]} />
      {x.issue && <Note><b>{x.issue.id} {x.issue.name}.</b> {x.issue.cause}</Note>}
      <div className="g12">
        <Panel title="This lot against sibling lots" span={5} charts={[mis]}><Chart desc={mis} height={240} /></Panel>
        <Panel title="Neighbouring lots from the same supplier" sub="Where the problem starts and stops." span={4} charts={[adj]}><Chart desc={adj} height={240} /></Panel>
        <Panel title="Where the vehicles are" span={3} charts={[wh]}><Chart desc={wh} height={240} /></Panel>
      </div>
      <DataTable csv={`lot-${x.lot}.csv`} max="280px" columns={['VIN', 'Model', 'Where', 'City', 'Built', 'State', 'Failure in 90 days']} rows={x.vehicles} />
    </div>
  );
}
function Plant({ c }: { c: CohortValue }) {
  const [check, setCheck] = useState('');
  const q = useQuery(() => ds.fetchPlant({ ...c, check }), [JSON.stringify(c), check]);
  const d: any = q.data;
  if (q.error) return <ErrorBox msg={q.error} />;
  if (!d) return <Loading />;
  const k = d.kpis, e = d.eol;
  const heat = C.heat(d.heat.x, d.heat.y, d.heat.d, { u: 'claims per 1,000 at three months in service', lab: 1, hi: 'More', lo: 'Fewer' });
  const sh = C.bar(d.shifts.x, d.shifts.series, { u: 'claims per 1,000 at six months' });
  const hist = e && C.hist(e.bins, e.failed, e.ok, { u: e.unit, an: 'Later failed in the field' });
  const ctl = e && C.line(e.control.x, [['Monthly mean', e.control.v]], { u: e.unit, marks: [['Upper control limit', e.control.ucl, 'warn'], ['Lower control limit', e.control.lcl, 'warn']] });
  return (
    <>
      <Kpis items={[{ label: 'Lines compared', value: k.lines }, { label: 'Highest claim rate at 12 months', value: k.worst }, { label: 'Claims from assembly process causes', value: k.process + '%' }, { label: 'Vehicles that passed the station check in the weak tail and later failed', value: fmt(k.escapes) }]} />
      <div className="g12">
        <Panel title="Field quality by line" sub="Claims per 1,000 vehicles at three and twelve months in service, early fault codes and the share of claims traced to a process cause." span={12} data={d.lines}>
          <DataTable csv="plant-lines.csv" columns={['Line', 'Models', 'Built', 'Claims per 1,000 at 3 months', 'At 12 months', 'Vehicles with a code in first 30 days, %', 'Claims from process causes, %', 'Most claimed in first 6 months', 'Open plant alerts']} rows={d.lines.map((r: any) => [r.line, r.models, r.built, r.r3 ?? '', r.r12 ?? '', r.early, r.process, r.top, r.alerts])} />
        </Panel>
        <Panel title="Build month by line" sub="Claims per 1,000 at three months in service. A dark run on one line is a process window." span={7} charts={[heat]}><Chart desc={heat} height={360} /></Panel>
        <Panel title="By shift" sub="A gap between shifts on the same line is the clearest sign of a process cause." span={5} charts={[sh]}><Chart desc={sh} height={360} /></Panel>
        {e && (
          <>
            <Panel title="Station measurement against field failure" sub={`${e.station}. Limits ${e.lsl} to ${e.usl} ${e.unit}; nominal ${e.nom}. Every vehicle shown passed the check.`} span={7} charts={[hist]} tools={<Select label="" value={e.key} onChange={setCheck} options={d.checks} all={null} />}
              facts={[`Vehicles in the weak tail failed ${e.weakFail}% of the time, against ${e.strongFail}% for the rest.`]}>
              <Chart desc={hist} height={280} />
              <div className="small"><b>Escape analysis:</b> vehicles that passed in the weak tail went on to fail <b>{e.weakFail}%</b> of the time, against <b>{e.strongFail}%</b> for the rest. {fmt(e.weakOpen)} vehicles in the weak tail have not failed yet.{e.issue ? ' Linked to ' + e.issue + '.' : ''}</div>
            </Panel>
            <Panel title="Station mean by build month" sub="The measurement stayed inside the pass limits but moved: a control chart would have caught it." span={5} charts={[ctl]}><Chart desc={ctl} height={280} /></Panel>
            <Panel title="Passed in the weak tail, not yet failed" sub="Candidates for inspection. Station values are generated for the demo." span={12} noAi><DataTable csv="weak-tail-vehicles.csv" max="300px" columns={['VIN', 'Model', 'Line', 'Shift', 'Built', e.name + ', ' + e.unit, 'Failure in 90 days']} rows={e.rows} /></Panel>
          </>
        )}
      </div>
    </>
  );
}
function Contain() {
  const f = useFilters();
  const [id, setId] = useState(urlParam('id') || 'Q-112');
  const q = useQuery(() => ds.fetchContain({ id }), [id]);
  const d: any = q.data;
  const wh = d && C.bar(d.where.map((r: any) => r[0]), [['Affected vehicles', d.where.map((r: any) => r[1])]], { lab: 1, u: 'vehicles' });
  return (
    <>
      <div className="pbar noprint"><Select label="Issue" value={id} onChange={setId} options={f ? f.issues : []} all={null} /></div>
      {q.error && <ErrorBox msg={q.error} />}{!d && !q.error && <Loading />}
      {d && (
        <div className="g12">
          <Panel title={`${d.id} ${d.name}`} sub={`${d.causeType}. ${d.cause}`} span={12} noAi><Facts items={[['Affected build window, from the data', d.window], ['Clean build point, estimated', d.clean], ['Remedy', d.fix]]} /></Panel>
          <Panel title="Where the affected vehicles are" sub="Vehicles not yet sold can be fixed before a customer ever sees the fault." span={5} charts={[wh]}><Chart desc={wh} height={260} /></Panel>
          <Panel title="Containment steps" span={7} data={d.steps}><DataTable columns={['Step', 'State']} rows={d.steps} render={(v, j) => (j === 1 ? <StatusBadge status={v} /> : undefined)} /></Panel>
          <Panel title="Unsold vehicles to hold and rework" span={12} noAi><DataTable csv={`containment-${d.id}.csv`} max="320px" columns={['VIN', 'Model', 'Where', 'Line', 'Built', 'Lot', 'Destination dealer']} rows={d.stock} />{d.stock.length === 0 && <p className="small muted">All affected vehicles are already with customers; containment is through the field action.</p>}</Panel>
        </div>
      )}
    </>
  );
}
export default function Supplier() {
  const [tab, setTab] = useState(urlParam('tab') || 'suppliers');
  const [c, setC] = useState<CohortValue>(urlParam('comp') ? { comp: urlParam('comp') } : {});
  return (
    <div className="stack">
      <SuiteHead art="software" eyebrow="Cost and source" title="Supplier and plant quality" sub="Joins field failures to what happened upstream: which supplier and lot the part came from, and which plant line, shift and station built the vehicle. Shows where suspect parts and vehicles are now. Demo data." />
      <Tabs tabs={[['suppliers', 'Suppliers and lots'], ['plant', 'Plant to field'], ['contain', 'Containment']]} value={tab} onChange={setTab} />
      {tab !== 'contain' && <CohortBar value={c} onChange={setC} show={tab === 'plant' ? ['seg', 'model', 'plant', 'buildY'] : ['seg', 'model', 'comp']} />}
      {tab === 'suppliers' && <Suppliers c={c} />}
      {tab === 'plant' && <Plant c={c} />}
      {tab === 'contain' && <Contain />}
    </div>
  );
}
