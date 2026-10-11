'use client';
// Illustrations drawn in code, in the Ravity palette. No external images, so the app works offline and nothing needs a licence.
import { ReactNode } from 'react';

const P = { purple: '#6c5dd3', pink: '#f00d69', teal: '#00d3cf', blue: '#2a78d6', ink: '#1a1a2e', soft: '#f0eeff', line: '#d4ccff', grey: '#e8e8f0', dark: '#1f1e1e', amber: '#ffcf52', white: '#ffffff' };

// Side view of a car facing right, in a 240 x 140 box. Children are drawn on top (pack, motor, markers).
export const CarShape = ({ body = P.dark, glass = P.line, wheel = P.ink, children }: { body?: string; glass?: string; wheel?: string; children?: ReactNode }) => (
  <g>
    <path d="M18 96V80q2-12 20-16l32-5q18-23 42-25h38q22 2 37 23l25 5q13 4 13 18v16z" fill={body} />
    <path d="M78 58q14-17 34-19h16v19zM134 39h16q14 2 27 19h-43z" fill={glass} />
    {children}
    <circle cx="66" cy="97" r="16" fill={wheel} /><circle cx="66" cy="97" r="7" fill={P.grey} />
    <circle cx="178" cy="97" r="16" fill={wheel} /><circle cx="178" cy="97" r="7" fill={P.grey} />
  </g>
);
const Bg = ({ children, tone = P.soft }: { children: ReactNode; tone?: string }) => (
  <svg viewBox="0 0 240 140" role="img" aria-hidden="true" className="art">
    <rect width="240" height="140" rx="14" fill={tone} />
    <circle cx="208" cy="22" r="34" fill={P.white} opacity=".55" /><circle cx="26" cy="126" r="26" fill={P.white} opacity=".45" />
    {children}
  </svg>
);
const Ground = () => <rect x="10" y="113" width="220" height="3" rx="1.5" fill={P.line} />;
const Bolt = ({ x, y, s = 1, fill = P.amber }: { x: number; y: number; s?: number; fill?: string }) => <path transform={`translate(${x} ${y}) scale(${s})`} d="M7 0L0 12h6l-2 10 9-13H7z" fill={fill} />;

const ART: Record<string, () => JSX.Element> = {
  battery: () => (
    <Bg>
      <Ground />
      <CarShape body="#dcdcec" glass={P.white}>
        <rect x="84" y="78" width="78" height="14" rx="3" fill={P.purple} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={88 + i * 10.4} y="81" width="7" height="8" rx="1.5" fill={i === 5 ? P.pink : P.teal} />)}
      </CarShape>
      <path d="M32 40a22 22 0 1 1 30 20" fill="none" stroke={P.line} strokeWidth="6" strokeLinecap="round" />
      <path d="M32 40a22 22 0 0 1 36-8" fill="none" stroke={P.teal} strokeWidth="6" strokeLinecap="round" />
      <text x="50" y="45" textAnchor="middle" fontSize="11" fontWeight="700" fill={P.ink} style={{ fontFamily: 'inherit' }}>95%</text>
    </Bg>
  ),
  safety: () => (
    <Bg tone="#fff0f7">
      <rect x="28" y="34" width="132" height="78" rx="8" fill={P.white} stroke={P.line} strokeWidth="2" />
      {Array.from({ length: 24 }).map((_, i) => { const c = i % 8, r = Math.floor(i / 8), hot = i === 11; return <rect key={i} x={36 + c * 15} y={42 + r * 22} width="11" height="17" rx="2.5" fill={hot ? P.pink : i === 10 || i === 12 || i === 3 || i === 19 ? '#f7a8c7' : P.line} />; })}
      <circle cx="87" cy="72" r="16" fill="none" stroke={P.pink} strokeWidth="1.5" opacity=".7" /><circle cx="87" cy="72" r="25" fill="none" stroke={P.pink} strokeWidth="1" opacity=".35" />
      <path d="M196 38l22 8v20c0 16-10 27-22 32-12-5-22-16-22-32V46z" fill={P.purple} />
      <path d="M186 68l8 8 14-16" fill="none" stroke={P.white} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </Bg>
  ),
  charging: () => (
    <Bg tone="#e9fbfa">
      <Ground />
      <g transform="translate(-14 0)"><CarShape body={P.dark} glass="#bfeeee"><rect x="84" y="80" width="78" height="10" rx="3" fill={P.teal} /></CarShape></g>
      <rect x="204" y="44" width="22" height="70" rx="5" fill={P.purple} /><rect x="208" y="50" width="14" height="16" rx="2" fill={P.white} />
      <Bolt x={209} y={72} s={0.9} />
      <path d="M204 96c-18 8-6-34-28-30" fill="none" stroke={P.ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="176" cy="66" r="4" fill={P.pink} />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={24 + i * 12} y={30 - i * 4} width="8" height={10 + i * 4} rx="2" fill={i === 3 ? P.teal : P.line} />)}
    </Bg>
  ),
  energy: () => (
    <Bg tone="#fffbec">
      <circle cx="40" cy="34" r="14" fill={P.amber} />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <rect key={a} x="39" y="12" width="2" height="6" rx="1" fill={P.amber} transform={`rotate(${a} 40 34)`} />)}
      <Ground />
      <CarShape body={P.purple} glass={P.white}><rect x="84" y="80" width="78" height="10" rx="3" fill={P.white} opacity=".9" /><rect x="84" y="80" width="52" height="10" rx="3" fill={P.teal} /></CarShape>
      <path d="M150 22h44M150 32h30M150 42h18" stroke={P.ink} strokeWidth="5" strokeLinecap="round" opacity=".8" />
      <path d="M196 22h14" stroke={P.pink} strokeWidth="5" strokeLinecap="round" /><path d="M182 32h10" stroke={P.teal} strokeWidth="5" strokeLinecap="round" />
    </Bg>
  ),
  reliability: () => (
    <Bg>
      <path d="M26 104V30M26 104h190" stroke={P.ink} strokeWidth="2" strokeLinecap="round" />
      <path d="M32 44c18 40 34 46 62 46s52 0 70-10 30-28 44-46" fill="none" stroke={P.purple} strokeWidth="4" strokeLinecap="round" />
      <path d="M32 44c14 30 26 40 44 44" fill="none" stroke={P.pink} strokeWidth="4" strokeLinecap="round" />
      {[[58, 76], [96, 90], [140, 88], [176, 72], [198, 52]].map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4.5" fill={P.white} stroke={i === 0 ? P.pink : P.purple} strokeWidth="2.5" />)}
      <g transform="translate(118 26) rotate(40)"><rect x="-4" y="6" width="8" height="34" rx="3" fill={P.ink} /><path d="M-11 0a11 11 0 1 0 22 0l-7 0 0 6-8 0 0-6z" fill={P.ink} /></g>
      <text x="40" y="124" fontSize="8.5" fill={P.ink} opacity=".7" style={{ fontFamily: 'inherit' }}>early life</text><text x="176" y="124" fontSize="8.5" fill={P.ink} opacity=".7" style={{ fontFamily: 'inherit' }}>wear-out</text>
    </Bg>
  ),
  software: () => (
    <Bg tone="#eef4ff">
      <Ground />
      <g transform="translate(10 6)"><CarShape body={P.dark} glass="#cfe0fb" /></g>
      <path d="M150 40a16 16 0 0 1 31-5 13 13 0 0 1 3 26h-34a11 11 0 0 1 0-21z" fill={P.white} stroke={P.blue} strokeWidth="2.5" />
      <path d="M166 44v14m-6-6l6 6 6-6" fill="none" stroke={P.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => <circle key={i} cx={144 - i * 9} cy={74 + i * 3} r="2.5" fill={P.blue} opacity={0.9 - i * 0.25} />)}
      {['2.4.1', '2.4.0', '2.3.4'].map((v, i) => <g key={v}><rect x="20" y={22 + i * 15} width="40" height="11" rx="5.5" fill={i === 0 ? P.purple : P.line} /><text x="40" y={30.5 + i * 15} textAnchor="middle" fontSize="7.5" fontWeight="700" fill={i === 0 ? P.white : P.ink} style={{ fontFamily: 'inherit' }}>{v}</text></g>)}
    </Bg>
  ),
  systems: () => (
    <Bg>
      <Ground />
      <CarShape body="#dcdcec" glass={P.white}><rect x="84" y="80" width="78" height="10" rx="3" fill={P.purple} opacity=".85" /></CarShape>
      {[[122, 85, '#166534'], [204, 74, '#e65100'], [40, 72, '#166534'], [150, 46, '#166534'], [178, 97, '#d32f2f'], [118, 32, '#e65100']].map((h, i) => <g key={i}><circle cx={h[0]} cy={h[1]} r="8" fill={h[2] as string} stroke={P.white} strokeWidth="2.5" /><text x={h[0]} y={(h[1] as number) + 3} textAnchor="middle" fontSize="8" fontWeight="700" fill={P.white} style={{ fontFamily: 'inherit' }}>{i + 1}</text></g>)}
    </Bg>
  ),
  dtc: () => (
    <Bg tone="#fff0f0">
      <path d="M52 30l34 60H18z" fill={P.amber} stroke={P.ink} strokeWidth="2.5" strokeLinejoin="round" /><rect x="50" y="50" width="4" height="20" rx="2" fill={P.ink} /><circle cx="52" cy="78" r="3" fill={P.ink} />
      {['P0AA6', 'P1C41', 'U0293', 'P0562', 'C1E01', 'P0A7F'].map((c, i) => <g key={c}><rect x={104 + (i % 2) * 62} y={28 + Math.floor(i / 2) * 28} width="54" height="20" rx="6" fill={i === 1 ? P.pink : P.white} stroke={P.line} /><text x={131 + (i % 2) * 62} y={41.5 + Math.floor(i / 2) * 28} textAnchor="middle" fontSize="9" fontWeight="700" fill={i === 1 ? P.white : P.ink} style={{ fontFamily: 'monospace' }}>{c}</text></g>)}
      <path d="M18 116h204" stroke={P.line} strokeWidth="3" strokeLinecap="round" /><path d="M18 116h120" stroke={P.pink} strokeWidth="3" strokeLinecap="round" />
    </Bg>
  ),
  analysis: () => (
    <Bg>
      <path d="M22 108h196" stroke={P.ink} strokeWidth="2" strokeLinecap="round" />
      <path d="M26 108c26 0 30-66 62-66s36 66 62 66z" fill={P.purple} opacity=".35" /><path d="M80 108c26 0 30-52 62-52s36 52 62 52z" fill={P.pink} opacity=".35" />
      <path d="M88 108V42M142 108V56" stroke={P.ink} strokeWidth="1.5" strokeDasharray="3 3" />
      <rect x="150" y="20" width="62" height="16" rx="8" fill={P.white} stroke={P.line} /><circle cx="160" cy="28" r="4" fill={P.purple} /><circle cx="186" cy="28" r="4" fill={P.pink} />
    </Bg>
  ),
  pattern: () => (
    <Bg tone="#eef4ff">
      {Array.from({ length: 40 }).map((_, i) => { const c = i % 10, r = Math.floor(i / 10), hit = [13, 14, 23, 24, 25].includes(i); return <circle key={i} cx={30 + c * 18} cy={34 + r * 22} r="5" fill={hit ? P.pink : P.line} />; })}
      <circle cx="100" cy="68" r="30" fill="none" stroke={P.ink} strokeWidth="4" /><path d="M122 90l22 24" stroke={P.ink} strokeWidth="6" strokeLinecap="round" />
    </Bg>
  ),
  road: () => (
    <Bg tone="#f0fdf4">
      <path d="M-4 120c60-6 60-48 120-50s70-40 130-48" fill="none" stroke={P.ink} strokeWidth="20" strokeLinecap="round" />
      <path d="M-4 120c60-6 60-48 120-50s70-40 130-48" fill="none" stroke={P.white} strokeWidth="2" strokeDasharray="8 8" />
      <path d="M60 104c20-10 26-24 44-30" fill="none" stroke="#e34948" strokeWidth="5" strokeLinecap="round" opacity=".9" />
      {[[78, 92], [150, 58]].map((p, i) => <g key={i}><path d={`M${p[0]} ${p[1] - 26}a9 9 0 0 1 9 9c0 7-9 16-9 16s-9-9-9-16a9 9 0 0 1 9-9z`} fill={P.pink} /><circle cx={p[0]} cy={p[1] - 17} r="3.5" fill={P.white} /></g>)}
    </Bg>
  ),
  atlas: () => (
    <Bg>
      <path d="M120 70L56 38M120 70l64-32M120 70L56 104M120 70l64 34M120 70V24M120 70v46" stroke={P.line} strokeWidth="2.5" />
      {[[56, 38, P.purple], [184, 38, P.pink], [56, 104, P.teal], [184, 104, P.blue], [120, 24, P.amber], [120, 116, P.ink]].map((n, i) => <circle key={i} cx={n[0]} cy={n[1]} r="12" fill={n[2] as string} />)}
      <circle cx="120" cy="70" r="20" fill={P.white} stroke={P.purple} strokeWidth="3" /><text x="120" y="74" textAnchor="middle" fontSize="12" fontWeight="800" fill={P.purple} style={{ fontFamily: 'inherit' }}>94</text>
    </Bg>
  ),
  reports: () => (
    <Bg tone="#eef4ff">
      <rect x="54" y="26" width="88" height="96" rx="8" fill={P.white} stroke={P.line} strokeWidth="2" transform="rotate(-5 98 74)" />
      <rect x="92" y="22" width="92" height="100" rx="8" fill={P.white} stroke={P.line} strokeWidth="2" />
      <path d="M104 40h46M104 52h66" stroke={P.ink} strokeWidth="4" strokeLinecap="round" opacity=".75" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={106 + i * 17} y={104 - [24, 38, 18, 30][i]} width="11" height={[24, 38, 18, 30][i]} rx="2.5" fill={i === 1 ? P.pink : P.purple} />)}
    </Bg>
  ),
  research: () => (
    <Bg>
      <path d="M40 34c26-8 54-8 80 6v78c-26-14-54-14-80-6z" fill={P.white} stroke={P.purple} strokeWidth="2.5" /><path d="M200 34c-26-8-54-8-80 6v78c26-14 54-14 80-6z" fill={P.white} stroke={P.purple} strokeWidth="2.5" />
      <path d="M54 54c16-4 32-3 52 4M54 68c16-4 32-3 52 4M54 82c16-4 32-3 52 4M134 58c20-7 36-8 52-4M134 72c20-7 36-8 52-4" fill="none" stroke={P.line} strokeWidth="3" strokeLinecap="round" />
      <path d="M134 86c20-7 36-8 52-4" fill="none" stroke={P.pink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="196" cy="26" r="13" fill={P.pink} /><text x="196" y="30" textAnchor="middle" fontSize="10" fontWeight="800" fill={P.white} style={{ fontFamily: 'inherit' }}>i</text>
    </Bg>
  ),
};
export default function Art({ name }: { name: string }) {
  const A = ART[name] || ART.analysis;
  return <A />;
}

// Suite header: title and summary on the left, illustration on the right.
export function SuiteHead({ art, title, sub, eyebrow = 'Analytics suite', chips, right }: { art: string; title: string; sub: string; eyebrow?: string; chips?: [string, any][]; right?: ReactNode }) {
  return (
    <div className="shead">
      <div className="shead-t">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p className="muted">{sub}</p>
        {chips && chips.length > 0 && <div className="shead-c">{chips.map((c) => <span key={c[0]}><b>{c[1]}</b>{c[0]}</span>)}</div>}
        {right && <div className="row noprint">{right}</div>}
      </div>
      <div className="shead-a"><Art name={art} /></div>
    </div>
  );
}
