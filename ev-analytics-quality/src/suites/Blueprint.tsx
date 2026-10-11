'use client';
// Objectives and benefits: who uses the product, what they are trying to achieve, which module helps, and what it is worth.
import { useState } from 'react';
import { SuiteHead } from '@/components/Art';
import { useApp } from '@/components/AppContext';
import Chart from '@/components/Chart';
import Panel from '@/components/Panel';
import { DataTable, ErrorBox, Loading, Tabs, fmt } from '@/components/ui';
import { chart as C } from '@/lib/charts';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';

export default function Blueprint() {
  const { go, me } = useApp();
  const [tab, setTab] = useState('objectives');
  const [per, setPer] = useState('');
  const q = useQuery(() => ds.fetchBlueprint(), []);
  const d: any = q.data;
  const head = <SuiteHead art="research" eyebrow="Reference" title="Objectives and benefits" sub="The product is built from the quality department's objectives outward: who the users are, what each is trying to achieve, which connected-vehicle data helps, which module delivers it, the measure to track and the benefit. Figures marked 'in this demo' are computed from the generated data." />;
  if (q.error) return <div className="stack">{head}<ErrorBox msg={q.error} /></div>;
  if (!d) return <div className="stack">{head}<Loading /></div>;
  const pn = (id: string) => d.personas.find((p: any) => p.id === id)?.name, mn = (id: string) => d.modules.find((m: any) => m.id === id);
  const objs = d.objectives.filter((o: any) => !per || o.personas.includes(per));
  const mx = C.heat(d.matrix.x, d.matrix.y, d.matrix.d, { min: 0, max: 2, hi: 'Main module', lo: 'Not used', u: '(2 = main module, 1 = supports)' });
  const lim = me.role?.id === 'RCL';
  return (
    <div className="stack">
      {head}
      <Tabs tabs={[['objectives', 'Objectives and benefits'], ['personas', 'Users'], ['modules', 'Modules and features'], ['scope', 'Scope of the demo']]} value={tab} onChange={setTab} />
      {tab === 'objectives' && (
        <>
          <div className="chips noprint"><button className="btn small" aria-pressed={!per} onClick={() => setPer('')}>All users</button>{d.personas.map((p: any) => <button key={p.id} className="btn small" aria-pressed={per === p.id} onClick={() => setPer(p.id)}>{p.name}</button>)}</div>
          {objs.map((o: any) => (
            <div className="objcard" key={o.id}>
              <h3><span className="mono small muted">{o.id}</span> {o.objective}</h3>
              <div><span className="eyebrow">Who</span><span>{o.personas.map(pn).join(', ')}</span><span className="eyebrow" style={{ marginTop: '.4rem' }}>Problem today</span><span>{o.problem}</span></div>
              <div><span className="eyebrow">Data that helps</span><span>{o.data}</span><span className="eyebrow" style={{ marginTop: '.4rem' }}>Module</span><span className="row">{o.modules.map((m: string) => (lim && m !== 'recall' ? <span key={m} className="pill n">{mn(m).name}</span> : <button key={m} className="btn small" onClick={() => go(mn(m).page)}>{mn(m).name}</button>))}</span></div>
              <div><span className="eyebrow">Measure to track</span><span>{o.kpi}</span><span className="eyebrow" style={{ marginTop: '.4rem' }}>Benefit</span><span>{o.benefit}</span></div>
              <div><span className="eyebrow">In this demo</span><span><b>{o.demo}</b></span><span className="eyebrow" style={{ marginTop: '.4rem' }}>Basis</span><span className="muted">{o.basis}</span></div>
            </div>
          ))}
          {!lim && <Panel title="Which module serves which objective" sub="Dark cells are the main module for the objective; light cells support it." span={12} charts={[mx]}><Chart desc={mx} height={440} /></Panel>}
        </>
      )}
      {tab === 'personas' && (
        <Panel title="Who uses the product" sub="Everyone in quality signs in with one department profile and sees everything, so decisions are made with the full picture. Roles outside quality get their own limited profile." span={12} noAi>
          <DataTable columns={['User', 'In quality', 'What they do', 'What they need from the product', 'Sign-in']} rows={d.personas.map((p: any) => [p.name, p.inQuality ? 'Yes' : 'No', p.does, p.needs, p.inQuality ? 'Quality department profile' : 'Recall office profile'])} />
        </Panel>
      )}
      {tab === 'modules' && (
        <>
          <div className="modcards">{d.modules.map((m: any) => (
            <div key={m.id}><span className="eyebrow">Module {m.n}</span><b>{m.name}</b><span className="small">{m.what}</span><ul>{m.features.map((f: string) => <li key={f}>{f}</li>)}</ul>{(!lim || m.id === 'recall') && <button className="btn small" style={{ alignSelf: 'flex-start' }} onClick={() => go(m.page)}>Open</button>}</div>
          ))}</div>
          <Panel title="Available on every screen" span={12} noAi><ul className="small" style={{ columns: 2, margin: 0, paddingLeft: '1.1rem' }}>{d.cross.map((x: string) => <li key={x}>{x}</li>)}</ul></Panel>
        </>
      )}
      {tab === 'scope' && (
        <Panel title="What the demo data covers" sub={`${fmt(d.scope.fleet)} connected EVs, represented by ${fmt(d.scope.sample)} sampled vehicles with weights; ${fmt(d.scope.claims)} sampled warranty claims; ${fmt(d.scope.events)} fault-code events; ${d.scope.kpis} KPIs; ${d.scope.codes} fault codes. Every vehicle, supplier, plant and document is invented.`} span={12} noAi>
          <DataTable columns={['Segment', 'Connected vehicles', 'Models']} rows={d.scope.segments} />
        </Panel>
      )}
    </div>
  );
}
