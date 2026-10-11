// Turns a chart descriptor into plain-language facts. Used for the page summary, and as input to AI analysis.
// @ts-nocheck
import { TILES } from './charts';
const num = (v) => (v && typeof v === 'object' ? v.value : v);
const f = (n) => (typeof n === 'number' ? (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-IN') : +n.toFixed(2)) : n);

export function factsFromChart(d) {
  if (!d || !d.a) return [];
  const a = d.a, out = [];
  try {
    if (d.k === 'line' || d.k === 'bar') {
      const x = a[0] || [];
      (a[1] || []).forEach((s) => {
        const pts = (s[1] || []).map((v, i) => [x[i] ?? i, num(v)]).filter((p) => typeof p[1] === 'number');
        if (!pts.length) return;
        const hi = pts.reduce((p, q) => (q[1] > p[1] ? q : p)), lo = pts.reduce((p, q) => (q[1] < p[1] ? q : p)), first = pts[0], last = pts[pts.length - 1];
        if (pts.length === 1) out.push(`${s[0] ? s[0] + ': ' : ''}${first[0]} is ${f(first[1])}.`);
        else if (d.k === 'line') out.push(`${s[0] || 'The line'} moves from ${f(first[1])} (${first[0]}) to ${f(last[1])} (${last[0]})${first[1] ? `, ${last[1] >= first[1] ? 'up' : 'down'} ${Math.abs(((last[1] - first[1]) / Math.abs(first[1])) * 100).toFixed(0)}%` : ''}; peak ${f(hi[1])} at ${hi[0]}.`);
        else out.push(`${s[0] ? s[0] + ': h' : 'H'}ighest is ${hi[0]} at ${f(hi[1])}, lowest ${lo[0]} at ${f(lo[1])}.`);
      });
      ((a[2] || {}).marks || []).forEach((m) => out.push(`Reference line "${m[0]}" at ${m[1]}.`));
    } else if (d.k === 'donut') {
      const s = [...a[0]].sort((p, q) => q[1] - p[1]), tot = s.reduce((p, q) => p + q[1], 0) || 1;
      out.push(`${s[0][0]} is the largest share at ${((s[0][1] / tot) * 100).toFixed(0)}%${s[1] ? `, then ${s[1][0]} at ${((s[1][1] / tot) * 100).toFixed(0)}%` : ''}.`);
    } else if (d.k === 'funnel') {
      const s = a[0];
      let worst = ['', 2];
      s.slice(1).forEach((x, i) => { const r = x[1] / (s[i][1] || 1); if (r < worst[1]) worst = [x[0], r]; });
      out.push(`From ${s[0][0]} (${f(s[0][1])}) to ${s[s.length - 1][0]} (${f(s[s.length - 1][1])}): ${((s[s.length - 1][1] / (s[0][1] || 1)) * 100).toFixed(1)}% carry through. The biggest drop is before ${worst[0]}.`);
    } else if (d.k === 'heat') {
      let hi = null, lo = null;
      a[2].forEach((row, j) => row.forEach((v, i) => { if (v === null || v === undefined) return; if (!hi || v > hi[2]) hi = [i, j, v]; if (!lo || v < lo[2]) lo = [i, j, v]; }));
      if (hi) out.push(`Highest is ${a[1][hi[1]]} / ${a[0][hi[0]]} at ${f(hi[2])}; lowest is ${a[1][lo[1]]} / ${a[0][lo[0]]} at ${f(lo[2])}.`);
    } else if (d.k === 'tile') {
      const e = Object.entries(a[0]).filter((x) => x[1] !== null).sort((p, q) => q[1] - p[1]);
      if (e.length) out.push(`Highest in ${(TILES[e[0][0]] || [, , e[0][0]])[2]} (${f(e[0][1])}); lowest in ${(TILES[e[e.length - 1][0]] || [, , e[e.length - 1][0]])[2]} (${f(e[e.length - 1][1])}).`);
    } else if (d.k === 'scat') {
      (a[0] || []).forEach((s) => {
        const p = s[1] || [], n = p.length;
        if (n < 3) return;
        const mx = p.reduce((t, q) => t + q[0], 0) / n, my = p.reduce((t, q) => t + q[1], 0) / n;
        const cov = p.reduce((t, q) => t + (q[0] - mx) * (q[1] - my), 0), sx = Math.sqrt(p.reduce((t, q) => t + (q[0] - mx) ** 2, 0)), sy = Math.sqrt(p.reduce((t, q) => t + (q[1] - my) ** 2, 0)), r = cov / (sx * sy || 1);
        const hi = p.reduce((u, q) => (q[1] > u[1] ? q : u));
        out.push(`${n} points. The two measures ${Math.abs(r) < 0.2 ? 'show little relationship' : (r > 0 ? 'rise together' : 'move in opposite directions') + (Math.abs(r) > 0.6 ? ' strongly' : ' moderately')} (correlation ${r.toFixed(2)}).${hi[2] ? ' Highest: ' + hi[2] + '.' : ''}`);
      });
    } else if (d.k === 'box') {
      const m = a[1].map((v, i) => [a[0][i], v[2]]), hi = m.reduce((p, q) => (q[1] > p[1] ? q : p)), lo = m.reduce((p, q) => (q[1] < p[1] ? q : p));
      out.push(`Median is highest for ${hi[0]} (${f(hi[1])}) and lowest for ${lo[0]} (${f(lo[1])}).`);
    } else if (d.k === 'gauge') out.push(`Reading is ${a[0]}${a[1] && a[1].name ? ' (' + a[1].name + ')' : ''}.`);
    else if (d.k === 'radar') (a[1] || []).forEach((s) => { const i = s[1].indexOf(Math.max(...s[1])), j = s[1].indexOf(Math.min(...s[1])); out.push(`${s[0]}: strongest on ${a[0][i][0]} (${s[1][i]}), weakest on ${a[0][j][0]} (${s[1][j]}).`); });
    else if (d.k === 'sankey') { const l = [...a[1]].sort((p, q) => q[2] - p[2])[0]; if (l) out.push(`The largest flow is ${l[0]} to ${l[1]} (${f(l[2])}).`); }
    else if (d.k === 'water') { const v = a[1].slice(0, -1), i = v.reduce((b, x, k) => (Math.abs(x) > Math.abs(v[b]) ? k : b), 0); out.push(`The largest step is ${a[0][i]} at ${f(v[i])}; the total is ${f(a[1][a[1].length - 1])}.`); }
    else if (d.k === 'hist') { const i = a[1].indexOf(Math.max(...a[1])); out.push(`Most vehicles sit near ${a[0][i]} (${a[1][i]}% of the cohort).`); }
    else if (d.k === 'span') out.push(`${a[0].length} items; the first is ${a[0][0][0]}.`);
  } catch (e) {}
  return out;
}
export const chartData = (d) => { try { return JSON.stringify(d.a).slice(0, 3500); } catch (e) { return ''; } };
