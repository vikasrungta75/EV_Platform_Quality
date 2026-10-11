'use client';
// Shared UI pieces.
import { ReactNode } from 'react';
import { KPI_COLORS } from '@/constants/theme';
import { downloadCsv } from '@/services/http';
import { useApp } from './AppContext';

export const KpiCard = ({ label, value, unit, color, trend, note }: { label: string; value: any; unit?: string; color?: string; trend?: number | null; note?: string }) => (
  <div className="kpi" style={{ ['--kc' as any]: color || KPI_COLORS[0] }}>
    <div className="kv">{value}{unit ? <small style={{ fontSize: '.8rem', fontWeight: 600 }}> {unit}</small> : null}</div>
    <div className="kl">{label}</div>
    {trend !== undefined && trend !== null && <div className="kt" style={{ color: trend >= 0 ? 'var(--crit)' : 'var(--good)' }}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% on the year before</div>}
    {note && <div className="small muted">{note}</div>}
  </div>
);
export const Kpis = ({ items }: { items: any[] }) => (
  <div className="kpis">{items.map((k, i) => <KpiCard key={i} color={KPI_COLORS[i % KPI_COLORS.length]} {...k} />)}</div>
);
export const Loading = ({ label = 'Loading' }: { label?: string }) => (<div className="loading"><span className="spin" />{label}…</div>);
export const ErrorBox = ({ msg }: { msg: string }) => <div className="err">{msg}</div>;
const SEVK: any = { Critical: 'r', High: 'a', Medium: 'n', Low: 'n', None: 'n' };
export const Sev = ({ s }: { s: string }) => <span className={`pill ${SEVK[s] || 'n'}`}>{s}</span>;
export const StatusBadge = ({ status }: { status: string }) => {
  const s = String(status).toLowerCase();
  const k = /not fixed|still not|reject|critical|emerging|^now$|^new$|^d$|did not fix/.test(s) ? 'r' : /^done|approved|recovered|^fixed|healthy|countermeasure|monitoring|linked|repaired|^a$|^met$/.test(s) ? 'g' : /pending|progress|investigat|await|proposed|acknowledged|within|confirmed|^c$|estimated|open/.test(s) ? 'a' : 'n';
  return <span className={`pill ${k}`}>{status}</span>;
};
export const Tabs = ({ tabs, value, onChange }: { tabs: [string, string][]; value: string; onChange: (v: string) => void }) => (
  <div className="tabs" role="tablist">{tabs.map((t) => <button key={t[0]} role="tab" aria-selected={value === t[0]} onClick={() => onChange(t[0])}>{t[1]}</button>)}</div>
);
export const Select = ({ label, value, onChange, options, all = 'All' }: { label: string; value: string; onChange: (v: string) => void; options: (string | [string, string] | any[])[]; all?: string | null }) => (
  <label>{label}
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {all !== null && <option value="">{all}</option>}
      {options.map((o: any) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}
    </select>
  </label>
);
const VIN_RE = /^MR9[A-Z0-9]{14}$/;
// A VIN anywhere in the product opens the vehicle information panel.
export const Vin = ({ vin }: { vin: string }) => {
  const { openVehicle } = useApp();
  return <button className="vinlink mono" onClick={(e) => { e.stopPropagation(); openVehicle(vin); }} title="Open vehicle information">{vin}</button>;
};
export function DataTable({ columns, rows, max, onRow, csv, render, sel }: { columns: string[]; rows: any[][]; max?: string; onRow?: (r: any[], i: number) => void; csv?: string; render?: (cell: any, col: number, row: any[]) => ReactNode; sel?: number }) {
  return (
    <>
      {csv && <div className="row noprint" style={{ justifyContent: 'flex-end' }}><button className="btn small" onClick={() => downloadCsv(csv, [columns, ...rows])}>Download CSV</button></div>}
      <div className="tw" style={max ? { maxHeight: max, overflow: 'auto' } : undefined}>
        <table>
          <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={columns.length} className="muted">No records.</td></tr>}
            {rows.map((r, i) => (
              <tr key={i} className={(onRow ? 'click' : '') + (sel === i ? ' on' : '')} tabIndex={onRow ? 0 : undefined} onClick={onRow ? () => onRow(r, i) : undefined} onKeyDown={onRow ? (e) => e.key === 'Enter' && onRow(r, i) : undefined}>
                {r.map((c, j) => {
                  const custom = render ? render(c, j, r) : undefined;
                  return <td key={j} className={typeof c === 'number' ? 'n' : undefined}>{custom !== undefined ? custom : typeof c === 'string' && VIN_RE.test(c) ? <Vin vin={c} /> : typeof c === 'number' ? c.toLocaleString('en-IN') : c}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export const fmt = (n: any) => (typeof n === 'number' ? n.toLocaleString('en-IN') : n);
export const inr = (n: number) => { const a = Math.abs(n); return a >= 1e7 ? 'Rs ' + (n / 1e7).toFixed(2) + ' crore' : a >= 1e5 ? 'Rs ' + (n / 1e5).toFixed(1) + ' lakh' : 'Rs ' + Math.round(n).toLocaleString('en-IN'); };
export const crore = (n: number) => +(n / 1e7).toFixed(2);
// Tiny inline trend, drawn as an SVG polyline.
export const Sparkline = ({ v, w = 86, h = 22 }: { v: number[]; w?: number; h?: number }) => {
  const mx = Math.max(1, ...v), pts = v.map((x, i) => `${(i / Math.max(1, v.length - 1)) * w},${h - 2 - (x / mx) * (h - 4)}`).join(' ');
  return <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
};
export const Meter = ({ v, max = 100, tone }: { v: number; max?: number; tone?: 'a' | 'r' | '' }) => <span className="meter"><i className={tone || ''} style={{ width: Math.min(100, (v / max) * 100) + '%' }} /></span>;
export const Note = ({ children }: { children: ReactNode }) => <div className="note">{children}</div>;
export const Facts = ({ items }: { items: [string, any][] }) => <div className="kvgrid">{items.map((x) => <div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div>;
