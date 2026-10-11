/* ===== Core helpers: seeded random numbers, statistics, dates. All data in this engine is generated; nothing is measured. ===== */
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const RNG=mulberry(20261011);
const rnd=()=>RNG();
const rint=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const pick=a=>a[Math.floor(rnd()*a.length)];
const wpick=pairs=>{let t=0;for(const p of pairs)t+=p[1];let r=rnd()*t;for(const p of pairs){r-=p[1];if(r<=0)return p[0];}return pairs[pairs.length-1][0];};
const gauss=()=>{let u=0;for(let i=0;i<6;i++)u+=rnd();return(u-3)*1.4142;};
// Deterministic hash noise, so a vehicle's KPI value is the same on every request without being stored.
const h32=(a,b)=>{let x=(Math.imul(a+1|0,0x9E3779B1)^Math.imul(b+7|0,0x85EBCA6B))>>>0;x^=x>>>15;x=Math.imul(x,0x2C1B3C6D);x^=x>>>12;x=Math.imul(x,0x297A2D39);x^=x>>>15;return(x>>>0)/4294967296;};
const hn=(a,b)=>(h32(a,b)+h32(a+911,b+3)+h32(a+1777,b+11)-1.5)*2;
const hstr=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};

const sum=a=>{let t=0;for(const x of a)t+=x;return t;};
const mean=a=>a.length?sum(a)/a.length:0;
const sdev=a=>{if(a.length<2)return 0;const m=mean(a);let t=0;for(const x of a)t+=(x-m)*(x-m);return Math.sqrt(t/(a.length-1));};
const quant=(a,q)=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y),p=(s.length-1)*q,i=Math.floor(p);return s[i]+(s[Math.min(s.length-1,i+1)]-s[i])*(p-i);};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const r1=x=>Math.round(x*10)/10, r2=x=>Math.round(x*100)/100, r0=x=>Math.round(x);
const pct=(a,b)=>b?r1(a/b*100):0;
const groupBy=(a,f)=>{const m=new Map();for(const x of a){const k=f(x);let g=m.get(k);if(!g){g=[];m.set(k,g);}g.push(x);}return m;};
const countBy=(a,f,w)=>{const m=new Map();for(const x of a){const k=f(x);m.set(k,(m.get(k)||0)+(w?w(x):1));}return m;};
const top=(m,n)=>[...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,n);
const uniq=a=>[...new Set(a)];
const normCdf=z=>{const t=1/(1+.2316419*Math.abs(z)),d=.3989423*Math.exp(-z*z/2),p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-p:p;};

// Calendar. The demo "today" is fixed so the data and the screens never drift apart.
const TODAY_MS=Date.UTC(2026,9,10),DAY_MS=864e5,MONTH_DAYS=30.4,HORIZON_M=36;
const dstr=daysAgo=>new Date(TODAY_MS-Math.round(daysAgo)*DAY_MS).toISOString().slice(0,10);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dnice=daysAgo=>{const d=new Date(TODAY_MS-Math.round(daysAgo)*DAY_MS);return d.getUTCDate()+' '+MON[d.getUTCMonth()]+' '+d.getUTCFullYear();};
// Month index 0 is the oldest month in the window (Nov 2023), 35 is the current month (Oct 2026).
const mlabel=m=>{const d=new Date(Date.UTC(2023,10+m,1));return MON[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2);};
const monthOfDay=daysAgo=>clamp(35-Math.floor(daysAgo/MONTH_DAYS),0,35);
const yymm=m=>{const d=new Date(Date.UTC(2023,10+m,1));return String(d.getUTCFullYear()).slice(2)+String(d.getUTCMonth()+1).padStart(2,'0');};
const yearOfM=m=>new Date(Date.UTC(2023,10+m,1)).getUTCFullYear();
const inr=n=>{const a=Math.abs(n);return a>=1e7?'Rs '+r2(n/1e7)+' crore':a>=1e5?'Rs '+r1(n/1e5)+' lakh':'Rs '+Math.round(n).toLocaleString('en-IN');};
const cr=n=>r2(n/1e7);
const num=n=>Math.round(n).toLocaleString('en-IN');
// Weibull pieces. Time is in months.
const weibT=(k,eta)=>eta*Math.pow(-Math.log(1-rnd()*0.999999),1/k);
const weibS=(t,k,eta)=>Math.exp(-Math.pow(Math.max(0,t)/eta,k));
