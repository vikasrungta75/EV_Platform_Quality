'use client';
// Shared filter bar: segment, model, climate zone, state, plant, usage, build year and component.
import { ReactNode } from 'react';
import { Select } from '@/components/ui';
import { useQuery } from '@/lib/useQuery';
import * as ds from '@/services/dataService';

export type CohortValue = ds.Cohort;
const FIELDS: [keyof ds.Cohort, string, string][] = [['seg', 'Segment', 'All segments'], ['model', 'Model', 'All models'], ['zone', 'Climate zone', 'All zones'], ['state', 'State', 'All states'], ['plant', 'Plant', 'All plants'], ['usage', 'Usage', 'All usage'], ['buildY', 'Build year', 'All years'], ['comp', 'Component', 'All components']];
let cache: any = null;
export function useFilters() {
  const r = useQuery(() => (cache ? Promise.resolve(cache) : ds.fetchFilters().then((d: any) => (cache = d))), []);
  return r.data as any;
}
export default function CohortBar({ value, onChange, show, children }: { value: CohortValue; onChange: (v: CohortValue) => void; show?: string[]; children?: ReactNode }) {
  const f = useFilters();
  const n = Object.values(value).filter(Boolean).length;
  const opts = (k: string) => (!f ? [] : k === 'seg' ? f.segs : k === 'model' ? f.models.filter((m: any) => !value.seg || m[2] === value.seg) : k === 'zone' ? f.zones : k === 'state' ? f.states : k === 'plant' ? f.plants : k === 'usage' ? f.usage : k === 'buildY' ? f.buildY : f.comps);
  return (
    <div className="pbar noprint">
      {FIELDS.filter((x) => !show || show.includes(x[0])).map(([k, label, all]) => (
        <Select key={k} label={label} value={(value as any)[k] || ''} onChange={(v) => onChange({ ...value, [k]: v || undefined, ...(k === 'seg' ? { model: undefined } : {}) })} options={opts(k)} all={all} />
      ))}
      {children}
      {n > 0 && <button className="btn small" onClick={() => onChange({})}>Reset ({n})</button>}
    </div>
  );
}
