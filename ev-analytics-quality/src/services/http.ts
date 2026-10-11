// HTTP service, following the fleet app's pattern: GET <rest-proxy>/<endpoint>?params -> records.
import { REST_PROXY } from '@/constants/api';

export async function fetchData<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  });
  const res = await fetch(REST_PROXY + endpoint + (qs.toString() ? '?' + qs : ''), { credentials: 'same-origin' });
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Not signed in');
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Request failed');
  return j.records as T;
}

export async function postJson<T = any>(url: string, body: any): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  if (res.status === 401 && !url.includes('/auth/login')) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Not signed in');
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Request failed');
  return j as T;
}

export function downloadCsv(filename: string, rows: any[][]) {
  const q = (s: any) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const blob = new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
