'use client';
// Vehicle 360: general information on any vehicle: build, software, lots, health, predictions, history and fault codes.
import { useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Chart from '@/components/Chart';
import Panel from '@/components/Panel';
import { DataTable, ErrorBox, Facts, Kpis, Loading, Note, Sev, StatusBadge, fmt, inr } from '@/components/ui';
import { chart as C } from '@/lib/charts';
import { urlParam } from '@/lib/hooks';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';

export default function Vehicle360() {
  const { go, me } = useApp();
  const [vin, setVin] = useState(urlParam('vin'));
  const [text, setText] = useState(urlParam('vin'));
  const sq = useQuery(() => (text.trim().length >= 3 && text !== vin ? ds.searchVehicles(text.trim()) : Promise.resolve({ rows: [] })), [text]);
  const q = useQuery(() => (vin ? ds.fetchVehicle({ vin }) : Promise.resolve(null)), [vin]);
  const d: any = q.data, hits: any[] = (sq.data as any)?.rows || [], lim = me.role?.id === 'RCL';
  const id = d?.identity;
  const hl = d && d.health && C.bar(d.health.map((x: any) => x[0]), [['Health score', d.health.map((x: any) => x[1])]], { horiz: 1, u: 'score, 100 is healthy', max: 100, cols: d.health.map((x: any) => (x[1] < 40 ? 'c8' : x[1] < 70 ? 'c4' : 'c3')) });
  return (
    <div className="stack">
      <SuiteHead art="battery" eyebrow="Investigate" title="Vehicle 360" sub="Everything on file for one vehicle: how and where it was built, which lots it carries, its software, how it is used, its health, what is predicted, and its full service, warranty and fault-code history. Demo data." />
      <div className="panel s12 noprint">
        <label className="small"><b>Find a vehicle</b><input type="search" className="mono" style={{ width: '100%' }} value={text} onChange={(e) => setText(e.target.value.toUpperCase())} placeholder="Type at least three characters of a VIN, for example MR9KX5" /></label>
        {hits.length > 0 && <DataTable columns={['VIN', 'Model', 'Segment', 'City', 'State', 'Built', 'Software', 'Odometer']} rows={hits.map((h) => [h.vin, h.model, h.seg, h.city, h.state, h.built, h.sw, h.odo])} onRow={(r) => { setVin(r[0]); setText(r[0]); }} render={(v, j) => (j === 0 ? <span className="mono">{v}</span> : undefined)} />}
      </div>
      {q.error && <ErrorBox msg={q.error} />}
      {vin && !d && !q.error && <Loading />}
      {!vin && <Note>Search for a VIN above. Anywhere else in the product, selecting a VIN opens the same information in a panel.</Note>}
      {d && (
        <>
          <div className="row" style={{ justifyContent: 'space-between' }}><h2 className="mono">{id.vin}</h2>{!lim && d.inService && <span className="row noprint"><button className="btn pri" onClick={() => go('rootcause', { tab: 'vin', vin: id.vin })}>Run AI failure report</button><button className="btn" onClick={() => go('rootcause', { tab: 'compare', vin: id.vin })}>Compare with peers</button></span>}</div>
          <Facts items={[['Model', id.model + ' · ' + id.kind], ['Segment', id.seg], ['Battery', id.pack], ['Built', id.built], ['Plant', id.plant + ' ' + id.line + ' · shift ' + id.shift], ['Sold', id.sold], ['Where', id.where], ['Location', id.city + ', ' + id.state], ['Climate zone', id.zone], ['Usage', id.usage + ' · ' + id.daily + ' km a day'], ['DC fast-charge share', id.dc + '%'], ['Odometer', fmt(id.odo) + ' km'], ['Dealer', id.dealer], ['Software', id.sw], ['Telematics firmware', id.tcu], ['Warranty', id.warranty]]} />
          {d.recall && d.recall.length > 0 && <Note>This vehicle is on an approved recall list: {d.recall.map((r: any) => `${r.id} ${r.name}: priority "${r.band}"${r.ttf ? ', about ' + r.ttf + ' days to failure' : ''}. ${r.fix}`).join(' ')}</Note>}
          {lim && <DataTable columns={['Date', 'Visit', 'Dealer', 'Odometer']} rows={d.history.map((h: any) => [h.date, h.type, h.dealer, h.odo])} />}
          {!lim && !d.inService && <Note>This vehicle has not been sold, so it has no field data yet.</Note>}
          {!lim && d.kpis && (
            <>
              <Kpis items={[{ label: 'Warranty claims', value: d.kpis.claims, note: inr(d.kpis.cost) }, { label: 'Fault-code events, 90 days', value: d.kpis.dtc90 }, { label: 'Active codes', value: d.kpis.active }, { label: 'Breakdown risk, 90 days', value: d.kpis.any90 + '%' }, { label: 'Open issues affecting it', value: d.kpis.issues }]} />
              <div className="g12">
                <Panel title="Component health" sub="100 is in line with peers." span={5} charts={[hl]}><Chart desc={hl} height={Math.max(260, d.health.length * 21)} /></Panel>
                <Panel title="Predicted failures" span={7} data={d.predicted}>
                  <DataTable columns={['Component', '30 days', '60 days', '90 days', 'Days to failure', 'Cause', 'Confidence', 'Priority']} rows={d.predicted.map((x: any) => [x.comp, x.p[0] + '%', x.p[1] + '%', x.p[2] + '%', x.ttf, x.driver, x.conf, x.band])} render={(v, j) => (j === 7 ? <StatusBadge status={v} /> : undefined)} />
                  {d.predicted.length === 0 && <p className="small muted">No component is above 2% in 90 days.</p>}
                  <h4>Quality issues that cover this vehicle</h4>
                  <DataTable columns={['Issue', 'Name', 'Issue status', 'This vehicle', 'Symptom strength %']} rows={d.issues} render={(v, j) => (j === 2 || j === 3 ? <StatusBadge status={v} /> : undefined)} onRow={(r) => go('rootcause', { tab: 'issue', id: r[0] })} />
                </Panel>
                <Panel title="Service and warranty history" span={12} noAi><DataTable csv={`history-${id.vin}.csv`} columns={['Date', 'Visit', 'What was done', 'Dealer', 'Odometer', 'Cost, Rs', 'No-fault-found']} rows={d.history.map((h: any) => [h.date, h.type, h.note, h.dealer, h.odo, h.cost, h.nff ? 'Yes' : ''])} /></Panel>
                <Panel title="Health indicators" sub="Current value against the typical value; furthest on the bad side first." span={7} data={d.indicators.slice(0, 15)}><DataTable csv={`indicators-${id.vin}.csv`} max="340px" columns={['Indicator', 'Component', 'Value', 'Unit', 'Typical', 'SD on the bad side']} rows={d.indicators} /></Panel>
                <Panel title="Software and component lots" span={5} noAi><DataTable columns={['Version', 'Installed', 'How']} rows={d.software} /><DataTable max="230px" columns={['Component', 'Supplier', 'Lot']} rows={id.lots} /></Panel>
                <Panel title="Fault-code history" span={12} noAi><DataTable csv={`fault-codes-${id.vin}.csv`} max="300px" columns={['Date', 'Code', 'Definition', 'Criticality', 'State', 'Count', 'Phase', 'Odometer']} rows={d.dtcs} render={(v, j) => (j === 3 ? <Sev s={v} /> : undefined)} />{d.dtcs.length === 0 && <p className="small muted">No fault code in the last 400 days.</p>}</Panel>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
