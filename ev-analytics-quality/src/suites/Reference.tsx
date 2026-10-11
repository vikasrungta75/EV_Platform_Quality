'use client';
// KPI library, research basis, and users and access.
import { useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Panel from '@/components/Panel';
import { DataTable, ErrorBox, Loading, Select, Tabs } from '@/components/ui';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';

export function KpiLibrary() {
  const [tab, setTab] = useState('signal');
  const [text, setText] = useState('');
  const [cat, setCat] = useState('');
  const q = useQuery(() => ds.fetchKpis(), []);
  const d: any = q.data;
  const head = <SuiteHead art="pattern" eyebrow="Reference" title="KPI library" sub="Every measure the product compares and tracks: trip KPIs from vehicle signals, component health indicators, and the quality measures used across the screens with how each is calculated." />;
  if (q.error) return <div className="stack">{head}<ErrorBox msg={q.error} /></div>;
  if (!d) return <div className="stack">{head}<Loading /></div>;
  const t = text.toLowerCase(), rows = d.rows.filter((r: any) => (!cat || r.cat === cat) && (!t || (r.name + ' ' + r.desc + ' ' + r.comp).toLowerCase().includes(t)));
  return (
    <div className="stack">
      {head}
      <Tabs tabs={[['signal', `Signal KPIs and health indicators (${d.rows.length})`], ['quality', `Quality measures (${d.quality.length})`]]} value={tab} onChange={setTab} />
      {tab === 'signal' && (
        <>
          <div className="pbar noprint"><label>Search<input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Name, description or component" /></label><Select label="System" value={cat} onChange={setCat} options={d.cats} /></div>
          <Panel title={`${rows.length} KPIs`} sub="All of these are compared in the workbench and the VIN failure report. Health indicators also drive signal drift and predictions." span={12} noAi>
            <DataTable csv="kpi-library.csv" max="640px" columns={['KPI', 'System', 'Type', 'What it measures', 'Unit', 'Normal range', 'Typical', 'Component', 'Bad direction', 'Precursor of']} rows={rows.map((r: any) => [r.name, r.cat, r.src, r.desc, r.unit, r.range, r.typical, r.comp, r.dir, r.precursor])} />
          </Panel>
        </>
      )}
      {tab === 'quality' && <Panel title="Quality measures and how they are calculated" span={12} noAi><DataTable csv="quality-measures.csv" columns={['Measure', 'How it is calculated', 'Used in']} rows={d.quality} /></Panel>}
    </div>
  );
}
export function Research() {
  const q = useQuery(() => ds.fetchResearch(), []);
  const d: any = q.data;
  const head = <SuiteHead art="research" eyebrow="Reference" title="Research basis" sub="The quality analytics products and documents reviewed while designing this product, what each one does, and what was taken from it. Also the methods used and the limits of the demo." />;
  if (q.error) return <div className="stack">{head}<ErrorBox msg={q.error} /></div>;
  if (!d) return <div className="stack">{head}<Loading /></div>;
  return (
    <div className="stack">
      {head}
      <Panel title="Products and documents reviewed" sub="Vendor figures are their own claims and were not independently checked." span={12} noAi>
        <DataTable columns={['Source', 'What was read', 'What it says', 'What this product took from it']} rows={d.products.map((p: any) => [p[0], p[1], p[2], p[3]])} />
        <ul className="small">{d.products.filter((p: any) => p[4]).map((p: any) => <li key={p[4]}><a href={p[4]} target="_blank" rel="noopener noreferrer">{p[0]}</a></li>)}</ul>
      </Panel>
      <Panel title="Methods used" span={12} noAi><DataTable columns={['Method', 'Where it is used', 'Note']} rows={d.methods} /></Panel>
      <Panel title="Limits of this demo" span={12} noAi><ul>{d.limits.map((x: string) => <li key={x}>{x}</li>)}</ul></Panel>
    </div>
  );
}
export function Users() {
  const { me } = useApp();
  return (
    <div className="stack">
      <SuiteHead art="software" eyebrow="Reference" title="Users and access" sub="One department profile for everyone in quality, a limited profile for the recall office, and an administrator who can view as either. Access is checked on the server for every query." />
      <Panel title="Accounts on this deployment" sub="Local demo accounts. Passwords are in CREDENTIALS.md in the code." span={12} noAi><DataTable columns={['Username', 'Name', 'Profile']} rows={(me.accounts || []).map((a: any) => [a.username, a.name, a.roleName])} /></Panel>
      <Panel title="What each profile can open" span={12} noAi>
        <DataTable columns={['Profile', 'Sees', 'Does not see']} rows={[['Quality department', 'Everything: all segments, models, plants, suppliers, vehicles, costs and agent findings', 'Nothing is hidden'], ['Recall office', 'Risk-ranked lists that quality has approved; vehicle look-up with build and visit history', 'Warranty cost, supplier names and lots, plant and shift data, issues not yet approved']]} />
      </Panel>
    </div>
  );
}
