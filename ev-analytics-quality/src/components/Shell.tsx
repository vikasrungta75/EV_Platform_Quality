'use client';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AppContext, AnalysisRequest } from './AppContext';
import { Spark } from './Panel';
import { getMe, logout, switchRole } from '@/services/authService';
import { analyse, askSage, fetchIssues, fetchVehicle } from '@/services/dataService';
import { DataTable, Facts, StatusBadge } from './ui';

export const Logo = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <path d="M16 3c5 4 5 9 0 13-5-4-5-9 0-13z" fill="#F00D69" /><path d="M29 16c-4 5-9 5-13 0 4-5 9-5 13 0z" fill="#6c5dd3" />
    <path d="M16 29c-5-4-5-9 0-13 5 4 5 9 0 13z" fill="#00D3CF" /><path d="M3 16c4-5 9-5 13 0-4 5-9 5-13 0z" fill="#4d69fa" />
  </svg>
);

export default function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const path = usePathname() || '';
  const cur = path.split('/')[2] || 'home';
  const [me, setMe] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [veh, setVeh] = useState<any>(null);
  const [toastMsg, setToast] = useState('');
  const [sage, setSage] = useState(false);
  const [log, setLog] = useState<{ q: string; a: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const [cmd, setCmd] = useState(false);
  const [cq, setCq] = useState('');
  const [ci, setCi] = useState(0);
  const [ucs, setUcs] = useState<any[]>([]);

  const load = useCallback(async () => {
    const m = await getMe();
    if (!m) { router.replace('/login'); return; }
    setMe(m);
  }, [router]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd((v) => !v); }
      else if (e.key === 'Escape') setCmd(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  useEffect(() => {
    if (!cmd) return;
    setCq('');
    setCi(0);
    if (!ucs.length && me && me.role?.id === 'QLT') fetchIssues().then((d: any) => setUcs(d.issues)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmd]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log, busy]);

  const toast = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(''), 3200); }, []);
  const openAnalysis = useCallback(async (r: AnalysisRequest) => {
    setAnalysis({ req: r, loading: true });
    try { setAnalysis({ req: r, res: await analyse(r) }); } catch (e: any) { setAnalysis({ req: r, error: e.message }); }
  }, []);
  const ask = useCallback(async (text: string, extra?: string) => {
    if (!text.trim()) return;
    setSage(true);
    setBusy(true);
    setLog((l) => [...l, { q: text, a: '' }]);
    try {
      const hist = log.filter((h) => h.a);
      const r: any = await askSage(text, hist, extra);
      setLog((l) => l.map((h, i) => (i === l.length - 1 ? { ...h, a: r.text } : h)));
    } catch (e: any) {
      setLog((l) => l.map((h, i) => (i === l.length - 1 ? { ...h, a: 'Sage could not answer: ' + e.message } : h)));
    }
    setBusy(false);
  }, [log]);

  const go = useCallback((page: string, params?: Record<string, string>) => { setVeh(null); setCmd(false); const qs = params ? '?' + new URLSearchParams(params).toString() : ''; router.push('/w/' + page + qs); }, [router]);
  const openVehicle = useCallback(async (vin: string) => { setVeh({ vin, loading: true }); try { setVeh({ vin, d: await fetchVehicle({ vin }) }); } catch (e: any) { setVeh({ vin, error: e.message }); } }, []);
  if (!me) return <div className="loading" style={{ padding: 40 }}><span className="spin" />Loading your workspace…</div>;
  const a = analysis;
  const cqt = cq.trim().toLowerCase();
  const hits: { label: string; hint: string; href: string }[] = !cmd ? [] : [
    ...me.nav.flatMap((g: any) => g.pages.map((p: any) => ({ label: p.label, hint: g.group, href: '/w/' + p.id }))).filter((x: any) => !cqt || (x.label + ' ' + x.hint).toLowerCase().includes(cqt)),
    ...(cqt.length > 1 ? ucs.filter((u) => (u.id + ' ' + u.name + ' ' + u.comp + ' ' + u.models).toLowerCase().includes(cqt)).slice(0, 8).map((u) => ({ label: u.id + ' ' + u.name, hint: 'Issue · ' + u.status, href: '/w/rootcause?tab=issue&id=' + u.id })) : []),
    ...(/^mr9[a-z0-9]{2,}/i.test(cq.trim()) ? [{ label: 'Vehicle ' + cq.trim().toUpperCase(), hint: 'Open vehicle information', href: 'vin:' + cq.trim().toUpperCase() }] : []),
  ].slice(0, 14);
  const pick = (h?: { href: string }) => { if (!h) return; setCmd(false); if (h.href.startsWith('vin:')) openVehicle(h.href.slice(4)); else router.push(h.href); };
  return (
    <AppContext.Provider value={{ me, openAnalysis, ask, toast, openVehicle, go }}>
      <div className="shell">
        <aside className={'rail' + (open ? ' open' : '')}>
          <div className="brand"><img src="/ravity-logo.svg" alt="Ravity" /><span>EV Analytics Quality</span></div>
          <div className="idcard">
            <b>{me.user.name}</b>
            <div className="small">{me.role?.name}</div>
            <div className="small dim">Sees: {me.role?.scope}</div>
            {me.user.admin && (
              <select aria-label="View as role" value={me.role?.id} onChange={async (e) => { await switchRole(e.target.value); try { sessionStorage.removeItem('ev_ws_state'); } catch {} await load(); router.push(e.target.value === 'RCL' ? '/w/recall' : '/w/home'); }}>
                {me.roles.map((r: any) => <option key={r.id} value={r.id}>View as: {r.name}</option>)}
              </select>
            )}
          </div>
          <nav aria-label="Workspace">
            {me.nav.map((g: any) => (
              <div className="navg" key={g.group}>
                <div className="navt">{g.group}</div>
                {g.pages.map((p: any) => <Link key={p.id} prefetch={false} href={'/w/' + p.id} aria-current={cur === p.id ? 'page' : undefined}>{p.label}</Link>)}
              </div>
            ))}
          </nav>
          <div className="railfoot"><button onClick={async () => { await logout(); try { sessionStorage.removeItem('ev_ws_state'); } catch {} router.replace('/login'); }}>Sign out</button></div>
        </aside>
        <div className="main">
          <div className="appbar noprint">
            <div className="row">
              <button className="btn small menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">Menu</button>
              <button className="searchbtn" onClick={() => setCmd(true)} aria-label="Search pages, issues and vehicles"><span>Search pages, issues or a VIN</span><kbd>Ctrl K</kbd></button>
              <span className="small muted">Demo data · last refreshed 10 Oct 2026, 06:00 IST</span>
            </div>
            <div className="row">
              <span className="ai-chip"><Spark />{me.ai ? 'AI analysis: Claude' : 'AI analysis: rule-based'}</span>
              <span className="who"><span className="small muted">{me.user.name}</span><span className="avatar" aria-hidden="true">{String(me.user.name || me.user.username).split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}</span></span>
            </div>
          </div>
          <div className="content">{children}</div>
        </div>
      </div>

      <button className="sagebtn noprint" onClick={() => setSage(true)}>Ask Sage</button>
      {sage && (
        <aside className="drawer" aria-label="Sage assistant">
          <div className="row" style={{ justifyContent: 'space-between' }}><div><h3>Sage</h3><div className="small muted">Scope: {me.role?.scope}</div></div><button className="btn small" onClick={() => setSage(false)}>Close</button></div>
          <div className="log" ref={logRef}>
            <div className="msg b">I am Sage. I answer from the quality data the {me.role?.name} profile can see: issues, alerts, agent findings and vehicles. I can also draft notes and messages.{!me.ai && ' No AI key is configured on this deployment, so answers are keyword matches. Try an issue number, a component or a VIN.'}</div>
            {log.map((h, i) => (<div key={i} style={{ display: 'contents' }}><div className="msg u">{h.q}</div><div className="msg b">{h.a || 'Thinking…'}</div></div>))}
          </div>
          <div className="row">{(me.role?.ask || []).map((q: string) => <button key={q} className="btn small" onClick={() => ask(q)}>{q}</button>)}</div>
          <form className="row" style={{ marginTop: '.5rem' }} onSubmit={(e) => { e.preventDefault(); const v = draft; setDraft(''); ask(v); }}>
            <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about what you can see" style={{ flex: 1, minWidth: 0 }} />
            <button className="btn pri" disabled={busy}>Ask</button>
          </form>
        </aside>
      )}

      {a && (
        <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setAnalysis(null)}>
          <div className="modal" role="dialog" aria-label="AI analysis">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="ai-chip"><Spark />{a.res ? (a.res.source === 'ai' ? 'AI analysis' : 'Rule-based analysis') : 'Analysing'}</span>
              <button className="btn small" onClick={() => setAnalysis(null)}>Close</button>
            </div>
            <h2>{a.req.title}</h2>
            {a.loading && <div className="loading"><span className="spin" />Reading the numbers…</div>}
            {a.error && <div className="err">{a.error}</div>}
            {a.res && (
              <>
                <p>{a.res.shows}</p>
                <div><h4>What stands out</h4><ul>{(a.res.observations || []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>
                <div><h4>Likely drivers</h4><ul>{(a.res.drivers || []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>
                <div><h4>Suggested next steps</h4><ul>{(a.res.actions || []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>
                <div><h4>Limits of this reading</h4><ul>{(a.res.caveats || []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>
                {a.res.source !== 'ai' && <p className="small muted">Built from the panel's own numbers with fixed rules. Add an AI key to the deployment for written analysis.</p>}
                <div className="row"><button className="btn small" onClick={() => { const r = a.req; setAnalysis(null); ask(`Tell me more about "${r.title}" and what I should do.`, r.facts.join('\n')); }}>Continue with Sage</button></div>
              </>
            )}
          </div>
        </div>
      )}
      {veh && (
        <div className="modal-back" onClick={(e) => e.target === e.currentTarget && setVeh(null)}>
          <div className="modal wide" role="dialog" aria-label="Vehicle information">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div><span className="eyebrow">Vehicle information</span><h2 className="mono">{veh.vin}</h2></div>
              <div className="row">
                {veh.d && !veh.d.restricted && veh.d.inService && <button className="btn pri small" onClick={() => go('rootcause', { tab: 'vin', vin: veh.vin })}>AI failure report</button>}
                <button className="btn small" onClick={() => go('vehicle', { vin: veh.vin })}>Vehicle 360</button>
                <button className="btn small" onClick={() => setVeh(null)}>Close</button>
              </div>
            </div>
            {veh.loading && <div className="loading"><span className="spin" />Loading…</div>}
            {veh.error && <div className="err">{veh.error}</div>}
            {veh.d && (() => { const id = veh.d.identity; return (
              <>
                <Facts items={[['Model', id.model + ' · ' + id.kind], ['Segment', id.seg], ['Battery', id.pack], ['Built', id.built + ', ' + id.plant + ' ' + id.line + ', shift ' + id.shift], ['Sold', id.sold], ['Where', id.where], ['Location', id.city + ', ' + id.state], ['Usage', id.usage + ', ' + id.daily + ' km a day'], ['Odometer', id.odo.toLocaleString('en-IN') + ' km'], ['Software', id.sw + ' · telematics ' + id.tcu], ['Dealer', id.dealer], ['Warranty', id.warranty]]} />
                {veh.d.kpis && <Facts items={[['Warranty claims', veh.d.kpis.claims], ['Fault codes, 90 days', veh.d.kpis.dtc90], ['Active codes', veh.d.kpis.active], ['Breakdown risk, 90 days', veh.d.kpis.any90 + '%'], ['Open issues', veh.d.kpis.issues]]} />}
                {veh.d.predicted && veh.d.predicted.length > 0 && <div><h4>Predicted failures</h4><DataTable columns={['Component', '30 days', '60 days', '90 days', 'Days to failure', 'Driver', 'Priority']} rows={veh.d.predicted.slice(0, 4).map((x: any) => [x.comp, x.p[0] + '%', x.p[1] + '%', x.p[2] + '%', x.ttf, x.driver, x.band])} render={(c, j) => (j === 6 ? <StatusBadge status={c} /> : undefined)} /></div>}
                {veh.d.recall && veh.d.recall.length > 0 && <div className="note">In an approved recall list: {veh.d.recall.map((r: any) => `${r.id} ${r.name} (${r.band})`).join('; ')}</div>}
                {veh.d.history && <div><h4>Service and warranty history</h4><DataTable max="220px" columns={veh.d.restricted ? ['Date', 'Visit', 'Dealer', 'Odometer'] : ['Date', 'Visit', 'What was done', 'Dealer', 'Odometer']} rows={veh.d.history.map((h: any) => (veh.d.restricted ? [h.date, h.type, h.dealer, h.odo] : [h.date, h.type, h.note, h.dealer, h.odo]))} /></div>}
              </>
            ); })()}
          </div>
        </div>
      )}
      {cmd && (
        <div className="cmdk-back" onClick={(e) => e.target === e.currentTarget && setCmd(false)}>
          <div className="cmdk" role="dialog" aria-label="Search">
            <input autoFocus type="text" value={cq} placeholder="Go to a page, find an issue, or type a VIN" aria-label="Search"
              onChange={(e) => { setCq(e.target.value); setCi(0); }}
              onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setCi(Math.min(hits.length - 1, ci + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setCi(Math.max(0, ci - 1)); } else if (e.key === 'Enter') pick(hits[ci]); }} />
            <ul role="listbox">
              {hits.length === 0 && <li className="muted" style={{ padding: '.7rem' }}>Nothing matches. Try a page name, an issue number, a component or a VIN starting MR9.</li>}
              {hits.map((h, i) => <li key={h.href + h.label}><button role="option" aria-selected={i === ci} onMouseEnter={() => setCi(i)} onClick={() => pick(h)}><span>{h.label}</span><small>{h.hint}</small></button></li>)}
            </ul>
          </div>
        </div>
      )}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </AppContext.Provider>
  );
}
