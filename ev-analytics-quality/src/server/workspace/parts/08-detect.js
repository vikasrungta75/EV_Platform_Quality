/* ===== Detection: contributing-factor ranking, the unified alert list, issue statistics and AI agent findings.
   Everything here is computed from the generated claims, fault codes, health indicators and predictions. Nothing is typed in by hand. ===== */
const HKPIS=KPIS.filter(k=>k.src==='health');
// Health-indicator z-scores in the "bad" direction, kept per vehicle because many screens need them.
for(const v of INSVC){v.hz=new Float32Array(HKPIS.length);HKPIS.forEach((K,i)=>{const z=kz(v,K);v.hz[i]=K.dir==='lo'?-z:z;});}
const bq=m=>{const d=new Date(Date.UTC(2023,10+m,1));return'Q'+(Math.floor(d.getUTCMonth()/3)+1)+' '+d.getUTCFullYear();};
const DIMS=[['Supplier',(v,c)=>c?SUPPLIERS[v.lots[c].split('-')[0]]:null,'Supplier'],['Supplier lot',(v,c)=>c?v.lots[c]:null,'Supplier'],['Plant line',v=>v.plant+' '+v.line,'Plant'],['Shift',v=>'Shift '+v.shift,'Plant'],['Build quarter',v=>bq(v.buildM),'Build'],
 ['Software',v=>v.sw,'Software'],['Telematics firmware',v=>v.tcu,'Software'],['Climate zone',v=>v.zone,'Usage'],['State',v=>v.state,'Usage'],['Usage',v=>v.usage,'Usage'],['DC fast-charge share',v=>v.dc>.5?'Above 50%':v.dc>.25?'25 to 50%':'Below 25%','Usage'],['Daily distance',v=>v.daily>SEG[v.seg].daily[0]*1.4?'High':v.daily<SEG[v.seg].daily[0]*.7?'Low':'Typical','Usage']];
/* Ranks what the failed vehicles have in common that the rest of the population does not.
   pop: vehicles at risk. hit: Set of vehicle indices that failed. comp: component whose lot and supplier to trace.
   Also scans every run of consecutive build months for the window that best separates failed from healthy vehicles.
   Rates are not adjusted for time in service, so build-date factors can partly reflect age. */
function factorLift(pop,hit,comp,minK){minK=minK||4;const N=pop.length,K=pop.filter(v=>hit.has(v.i)).length,out=[];if(!K||N-K<5)return out;const pp=K/N;
 const stat=(n,k)=>{const a=k/n,b=(K-k)/Math.max(1,N-n);return{rate:r1(a*100),rest:r1(b*100),rr:r1(Math.min(a/Math.max(b,.5/Math.max(1,N-n)),99)),z:r1((a-b)/Math.sqrt(Math.max(1e-9,pp*(1-pp)*(1/n+1/Math.max(1,N-n))))),cover:r0(k/K*100)};};
 for(const [dim,f,kind] of DIMS){const m=new Map();for(const v of pop){const key=f(v,comp);if(key===null)continue;let g=m.get(key);if(!g){g=[0,0];m.set(key,g);}g[0]++;if(hit.has(v.i))g[1]++;}
  if(m.size<2)continue;
  for(const [val,[n,k]] of m){if(k<minK||n===N)continue;const s=stat(n,k);if(s.rr>=1.4&&s.z>=2.2)out.push({dim,kind,val,n,k,...s,test:v=>f(v,comp)===val});}}
 const bn=Array(36).fill(0),bk=Array(36).fill(0);for(const v of pop){bn[v.buildM]++;if(hit.has(v.i))bk[v.buildM]++;}
 let best=null;for(let a=0;a<36;a++){let n=0,k=0;for(let b=a;b<36;b++){n+=bn[b];k+=bk[b];if(k<minK||n>N*.7||!bk[a]||!bk[b])continue;const s=stat(n,k);if(s.rr>=1.6&&(!best||s.z>best.z))best={dim:'Build window',kind:'Build',val:a===b?mlabel(a):mlabel(a)+' to '+mlabel(b),n,k,...s,from:a,to:b,test:v=>v.buildM>=a&&v.buildM<=b};}}
 if(best&&best.z>=2.2)out.push(best);
 return out.sort((a,b)=>b.z-a.z).slice(0,12);}
// Greedy two-step rule: the best factor, then the best second factor inside it. Gives the "which vehicles" statement.
function isolate(pop,hit,comp){const f1=factorLift(pop,hit,comp).sort((a,b)=>b.z*(.6+b.cover/250)-a.z*(.6+a.cover/250))[0];if(!f1)return null;const in1=pop.filter(f1.test),k1=in1.filter(v=>hit.has(v.i)).length;
 const same=(a,b)=>a.dim===b.dim||(a.kind==='Build'&&b.kind==='Build')||(a.kind==='Build'&&b.dim==='Supplier lot')||(b.kind==='Build'&&a.dim==='Supplier lot')||(a.kind==='Supplier'&&b.kind==='Supplier');
 const f2=factorLift(in1,hit,comp,5).filter(f=>!same(f,f1)&&f.z>=3&&f.rr>=1.8&&f.k>=Math.max(5,k1*.4))[0];
 let sel=in1,text=f1.dim+' = '+f1.val;if(f2){sel=in1.filter(f2.test);text+=' and '+f2.dim.toLowerCase()+' = '+f2.val;}
 const k=sel.filter(v=>hit.has(v.i)).length,K=pop.filter(v=>hit.has(v.i)).length;
 return{text,n:sel.length,w:WSUM(sel),k,rate:pct(k,sel.length),cover:pct(k,K),f1,f2:f2||null,test:v=>f1.test(v)&&(!f2||f2.test(v))};}
const issueFor=(model,comp)=>ISSUES.find(I=>I.models.includes(model)&&(I.comp===comp||(I.claimAs&&I.claimAs.some(c=>c[0]===comp))));
const weekly=(days,w,n)=>{const a=Array(n).fill(0);days.forEach((d,i)=>{const k=n-1-Math.floor(d/7);if(k>=0&&k<n)a[k]+=w?w[i]:1;});return a.map(r0);};

/* Issue statistics, used by the command centre, root cause, predictive, supplier and recall screens. */
const ISTAT={};
for(const I of ISSUES){const aff=FLEET.filter(v=>v.iss.some(a=>a.id===I.id)),cl=CLAIMS.filter(c=>c.issue===I.id),open=aff.filter(v=>v.iss.some(a=>a.id===I.id&&!a.fixed));
 const leads=[];for(const c of cl){if(c.repeatOf)continue;const v=FLEET[c.v],first=Math.max(-1,...v.dtcs.filter(e=>I.seq.includes(e.code)&&e.day>c.failDay).map(e=>e.day));if(first>0&&c.failDay<DTC_WINDOW-I.lead*1.6)leads.push(first-c.failDay);}
 let e90=0,e30=0,n30=0;for(const v of open){const p=predOf(v,I.comp);if(p&&p.driver===I.id){e90+=p.p[2]*v.w;e30+=p.p[0]*v.w;if(p.p[0]>=.5)n30+=v.w;}}
 const stockAff=FLEET.filter(v=>!v.inService&&I.pred(v));
 ISTAT[I.id]={id:I.id,aff:aff.length,affW:WSUM(aff),claims:cl.length,claimsW:r0(sum(cl.map(claimW))),cost:sum(cl.map(c=>c.total*claimW(c))),nff:pct(cl.filter(c=>c.nff).length,cl.length),repeat:pct(cl.filter(c=>c.repeatOf).length,cl.length),
  open:open.length,openW:WSUM(open),failedPct:pct(aff.length-open.length,aff.length),e90:r0(e90),e30:r0(e30),n30:r0(n30),firstClaim:cl.length?Math.max(...cl.map(c=>c.day)):null,lead:leads.length?r0(quant(leads,.5)):null,leadN:leads.length,
  stock:stockAff.length,stockW:WSUM(stockAff),avgCost:cl.length?r0(mean(cl.map(c=>c.total))):0,opened:I.status==='Emerging'?null:r0(40+h32(I.h,3)*160)};}

/* ---- Alerts ---- */
const ALERTS=[];
const SEV=['Critical','High','Medium','Low'];
function pushAlert(a){const C=COMP[a.comp],I=(a.code&&ISSUES.find(x=>x.models.includes(a.model)&&x.seq.includes(a.code)))||issueFor(a.model,a.comp);a.id='AL-'+(1001+ALERTS.length);a.seg=MODEL[a.model].seg;a.segName=SEG[a.seg].name;a.modelName=MODEL[a.model].name;a.compName=C.name;a.system=C.sys;a.safety=C.safety>=3||a.crit1?'Yes':'No';
 a.issue=I?I.id:null;a.owner=OWNER_OF[a.comp];
 a.status=!I?(h32(hstr(a.key),5)<.55?'New':'Acknowledged'):I.status==='Emerging'?'New':I.status==='Investigating'?'In investigation':'Linked to case';
 a.day=a.day!==undefined?a.day:r0(h32(hstr(a.key),9)*(a.status==='New'?9:28));a.date=dstr(a.day);
 const s=(C.safety>=3?2:C.safety===2?1:0)+(a.strength>=6?2:a.strength>=3.5?1:0)+(a.crit1?2:0);a.severity=s>=4?'Critical':s>=2?'High':s>=1?'Medium':'Low';
 ALERTS.push(a);}
(function detect(){
 for(const M of MODELS){const pop=INSVC.filter(v=>v.model===M.id),S=SEG[M.seg],w=S.fleet/S.sample,segPop=INSVC.filter(v=>v.seg===M.seg);if(pop.length<30)continue;
  const expR=pop.filter(v=>v.saleDay>45).length||1,expP=pop.filter(v=>v.saleDay>225).length||1,mcl=CLAIMS.filter(c=>FLEET[c.v].model===M.id);
  for(const C of COMPS){if(C.exclude.includes(M.seg))continue;const cl=mcl.filter(c=>c.comp===C.id);
   // (a) Warranty claims: last 90 days against the previous 270 days, per vehicle in service.
   const nR=cl.filter(c=>c.day<90).length,nP=cl.filter(c=>c.day>=90&&c.day<360).length;let base=nP/expP/3;
   if(nP<3){const sc=CLAIMS.filter(c=>c.comp===C.id&&FLEET[c.v].seg===M.seg&&c.day>=90&&c.day<360).length;base=Math.max(base,sc/Math.max(1,segPop.filter(v=>v.saleDay>225).length)/3);}
   const E=Math.max(.6,base*expR),rr=nR/E,z=(nR-E)/Math.sqrt(E);
   let lift=null;const hit=new Set(cl.map(c=>c.v));if(cl.length>=8)lift=isolate(pop,hit,C.id);
   if(nR>=6&&rr>=1.7&&z>=3)pushAlert({key:'W'+M.id+C.id,source:'Warranty claims',model:M.id,comp:C.id,strength:z,title:`${C.name} claims rising on ${M.name}`,metric:`${r1(nR/expR*1000)} claims per 1,000 vehicles in 90 days, against ${r1(E/expR*1000)} expected`,ratio:r1(rr),n:r0(nR*w),vehicles:r0(uniq(cl.filter(c=>c.day<90).map(c=>c.v)).length*w),
    spark:weekly(cl.filter(c=>c.day<182).map(c=>c.day),null,26),where:lift?lift.text:'No single factor stands out yet',lot:lift&&lift.f1.dim==='Supplier lot'?lift.f1.val:'',action:'Open an issue and run contributing-factor analysis'});
   // (b) Supplier lot and plant process: what the failed vehicles share.
   if(cl.length>=10){const fs=factorLift(pop,hit,C.id,5);const sup=fs.find(f=>f.kind==='Supplier'),pl=fs.find(f=>f.kind==='Plant'),sw=fs.find(f=>f.kind==='Software');
    if(sup&&sup.rr>=2.5&&sup.z>=3.5)pushAlert({key:'S'+M.id+C.id,source:'Supplier lot',model:M.id,comp:C.id,strength:sup.z,title:`${sup.dim} ${sup.val} over-represented in ${C.name.toLowerCase()} failures`,metric:`${sup.rate}% of vehicles with this ${sup.dim.toLowerCase()} have claimed, against ${sup.rest}% for the rest`,ratio:sup.rr,n:r0(sup.k*w),vehicles:r0(sup.n*w),spark:weekly(cl.filter(c=>c.day<182&&sup.test(FLEET[c.v])).map(c=>c.day),null,26),where:sup.dim+' = '+sup.val,lot:sup.dim==='Supplier lot'?sup.val:'',action:'Hold remaining stock from the lot and request supplier teardown'});
    if(pl&&pl.rr>=2.2&&pl.z>=3.5)pushAlert({key:'P'+M.id+C.id,source:'Plant process',model:M.id,comp:C.id,strength:pl.z,title:`${pl.val} over-represented in ${C.name.toLowerCase()} failures on ${M.name}`,metric:`${pl.rate}% of vehicles from ${pl.val} have claimed, against ${pl.rest}% for the rest`,ratio:pl.rr,n:r0(pl.k*w),vehicles:r0(pl.n*w),spark:weekly(cl.filter(c=>c.day<182).map(c=>c.day),null,26),where:pl.dim+' = '+pl.val,lot:'',action:'Audit the station and check end-of-line records for the build window'});
    if(sw&&sw.rr>=2.2&&sw.z>=3.5)pushAlert({key:'F'+M.id+C.id,source:'Software version',model:M.id,comp:C.id,strength:sw.z,title:`${sw.dim} ${sw.val} linked to ${C.name.toLowerCase()} failures on ${M.name}`,metric:`${sw.rate}% of vehicles on ${sw.val} have claimed, against ${sw.rest}% on other versions`,ratio:sw.rr,n:r0(sw.k*w),vehicles:r0(sw.n*w),spark:weekly(cl.filter(c=>c.day<182).map(c=>c.day),null,26),where:sw.dim+' = '+sw.val,lot:'',action:'Review the release notes and plan a corrective update'});}
   // (c) No-fault-found and repeat repair.
   const c180=cl.filter(c=>c.day<180),nf=c180.filter(c=>c.nff).length;
   if(c180.length>=10&&nf/c180.length>=.3)pushAlert({key:'N'+M.id+C.id,source:'No-fault-found',model:M.id,comp:C.id,strength:nf/c180.length*10,title:`${C.name} replaced without fixing the fault on ${M.name}`,metric:`${pct(nf,c180.length)}% of ${C.name.toLowerCase()} claims in 180 days were no-fault-found; ${pct(c180.filter(c=>c.repeatOf).length,c180.length)}% were repeat visits`,ratio:r1(nf/c180.length/.05),n:r0(nf*w),vehicles:r0(uniq(c180.filter(c=>c.nff).map(c=>c.v)).length*w),spark:weekly(c180.filter(c=>c.nff).map(c=>c.day),null,26),where:'True cause is likely elsewhere',lot:'',action:'Stop replacing this part for the symptom and investigate the true cause'});
   // (d) Fault codes: vehicles showing the component's codes in the last 30 days against the 90 days before.
   const codes=DTCS.filter(d=>d[2]===C.id).map(d=>d[0]);let bestC=null;
   for(const code of codes){const ev=DTCE.filter(e=>e.code===code&&FLEET[e.v].model===M.id),r=uniq(ev.filter(e=>e.day<30).map(e=>e.v)).length,p=uniq(ev.filter(e=>e.day>=30&&e.day<120).map(e=>e.v)).length/3,Ed=Math.max(.7,p),zz=(r-Ed)/Math.sqrt(Ed);
    if(r>=7&&r/Ed>=1.8&&zz>=3&&(!bestC||zz>bestC.z))bestC={code,r,Ed,z:zz,ev};}
   if(bestC){const D=DTC[bestC.code];pushAlert({key:'D'+M.id+C.id,source:'Fault codes',model:M.id,comp:C.id,strength:bestC.z,crit1:D.crit===1,title:`${bestC.code} spreading on ${M.name}`,metric:`${r1(bestC.r/pop.length*1000)} vehicles per 1,000 set ${bestC.code} in 30 days, against ${r1(bestC.Ed/pop.length*1000)} expected`,ratio:r1(bestC.r/bestC.Ed),n:r0(bestC.r*w),vehicles:r0(bestC.r*w),code:bestC.code,
     spark:weekly(bestC.ev.filter(e=>e.day<182).map(e=>e.day),null,26),where:D.def,lot:'',action:'Review freeze-frame context and compare affected vehicles with healthy peers'});}
   // (e) Signal drift: share of vehicles whose health indicator sits more than 2.5 standard deviations on the bad side.
   let bestK=null;HKPIS.forEach((K,i)=>{if(K.comp!==C.id)return;const n=pop.filter(v=>v.hz[i]>=2.5).length,sh=n/pop.length;if(n>=8&&sh>=.012&&(!bestK||n>bestK.n))bestK={K,i,n,sh};});
   if(bestK){const dv=pop.filter(v=>v.hz[bestK.i]>=2.5),noClaim=dv.filter(v=>!v.claims.some(c=>c.comp===C.id)).length;pushAlert({key:'G'+M.id+C.id,source:'Signal drift',model:M.id,comp:C.id,strength:Math.min(9,bestK.sh*100),title:`${bestK.K.name} drifting on ${M.name}`,metric:`${r1(bestK.sh*100)}% of vehicles are more than 2.5 standard deviations ${bestK.K.dir==='lo'?'below':'above'} peers; ${pct(noClaim,dv.length)}% of them have no claim yet`,ratio:r1(bestK.sh/.006),n:r0(bestK.n*w),vehicles:r0(bestK.n*w),kpi:bestK.K.key,
     spark:weekly(dv.map(v=>h32(v.i,77)*150),null,26).map((x,i,a)=>r0(sum(a.slice(0,i+1))/4)),where:(isolate(pop,new Set(dv.map(v=>v.i)),C.id)||{text:'Spread across the model'}).text,lot:'',action:'Earlier than claims or codes: confirm with a workshop inspection of five vehicles'});}
   // (f) Predictive: failures expected in the next 90 days against the last 90 days of claims.
   let e90=0,n30=0;const soon=[];for(const v of pop){const p=predOf(v,C.id);if(!p||p.driver==='Wear and age')continue;e90+=p.p[2];if(p.p[0]>=.5){n30++;soon.push(v);}}
   const last=mcl.filter(c=>c.trueComp===C.id&&c.day<90).length;
   if(e90>=5&&(e90>=1.4*Math.max(1,last)||n30>=5))pushAlert({key:'X'+M.id+C.id,source:'Predictive',model:M.id,comp:C.id,strength:Math.min(9,2+e90/4),title:`${r0(e90*w).toLocaleString('en-IN')} ${C.name.toLowerCase()} failures expected on ${M.name} in 90 days`,metric:`${r0(n30*w).toLocaleString('en-IN')} vehicles are more likely than not to fail within 30 days; ${r0(last*w).toLocaleString('en-IN')} failed in the last 90 days`,ratio:r1(e90/Math.max(1,last)),n:r0(e90*w),vehicles:r0(n30*w),
    spark:weekly(pop.map(v=>{const p=predOf(v,C.id);return p&&p.driver!=='Wear and age'?182-Math.min(181,p.ttf):999;}).filter(d=>d<182),null,26),where:'Risk-ranked vehicle list is ready',lot:'',action:'Bring in the highest-risk vehicles first; order parts for the expected volume'});
  }
  // (g) Launch: claims per 1,000 at three months in service against the predecessor.
  if(35-M.launch<=9&&M.pre){const r3=m=>{const p=INSVC.filter(v=>v.model===m&&misOf(v)>=3),n=CLAIMS.filter(c=>FLEET[c.v].model===m&&c.mis<=3&&misOf(FLEET[c.v])>=3).length;return p.length?n/p.length*1000:0;},a=r3(M.id),b=r3(M.pre);
   if(a>b*1.3)pushAlert({key:'L'+M.id,source:'Launch monitor',model:M.id,comp:'info',strength:Math.min(9,(a/b)*2),title:`${M.name} launch: claims at three months above ${MODEL[M.pre].name}`,metric:`${r0(a)} claims per 1,000 vehicles at three months in service, against ${r0(b)} for ${MODEL[M.pre].name}`,ratio:r1(a/Math.max(1,b)),n:r0(mcl.length*w),vehicles:r0(pop.length*w),spark:weekly(mcl.filter(c=>c.day<182).map(c=>c.day),null,26),where:'First '+(35-M.launch)+' months of production',lot:'',action:'Weekly launch review until the three-month rate is at target'});}
 }
 // (h) Active critical fault codes right now.
 const crit=groupBy(DTCE.filter(e=>e.day<10&&e.st==='Active'&&DTC[e.code].crit===1),e=>FLEET[e.v].model+'|'+e.code);
 for(const [k,ev] of crit){const [m,code]=k.split('|'),vs=uniq(ev.map(e=>e.v));if(vs.length<2)continue;const w=FLEET[vs[0]].w;pushAlert({key:'C'+k,source:'Fault codes',model:m,comp:DTC[code].comp,strength:6+vs.length/3,crit1:true,day:0,title:`${r0(vs.length*w).toLocaleString('en-IN')} ${MODEL[m].name} vehicles have critical code ${code} active`,metric:DTC[code].def+'. '+DTC[code].does,ratio:r1(vs.length),n:r0(vs.length*w),vehicles:r0(vs.length*w),code,spark:weekly(DTCE.filter(e=>e.code===code&&FLEET[e.v].model===m&&e.day<182).map(e=>e.day),null,26),where:'Stop-drive advice applies',lot:'',action:'Contact owners today; arrange recovery and inspection'});}
 ALERTS.sort((a,b)=>SEV.indexOf(a.severity)-SEV.indexOf(b.severity)||a.day-b.day);
 ALERTS.forEach(a=>{const I=a.issue&&ISSUE[a.issue];a.plant=MODEL[a.model].plant;a.supplier=a.lot?SUPPLIERS[a.lot.split('-')[0]]:'';a.issueName=I?I.name:'';});
})();

/* ---- AI agent findings: one finding per cluster of alerts, with the evidence and the actions the agent proposes. A person approves each action. ---- */
const AGENTS=[
 {id:'miner',name:'Early warning miner',does:'Mines warranty claims, fault codes, health indicators and predictions every night for patterns that are new or accelerating, and says which vehicles share them.',inputs:'Claims, fault codes, health indicators, build and supplier records',runs:'Nightly, 02:00 IST'},
 {id:'rca',name:'Root cause investigator',does:'For every new failure, compares the vehicle with healthy peers and similar populations, reads the fault sequence, history, bulletins and past cases, and writes the failure report.',inputs:'Vehicle telemetry, fault codes, claims, bulletins, past cases, public web',runs:'On every claim and on request'},
 {id:'nff',name:'No-fault-found auditor',does:'Finds parts that are replaced without fixing the complaint, and uses telemetry to point at the true cause.',inputs:'Claims, repeat visits, supplier teardown results, health indicators',runs:'Weekly, Monday'},
 {id:'pred',name:'Failure predictor',does:'Scores every vehicle and component for failure within 30, 60 and 90 days, and forecasts fault codes and parts demand.',inputs:'Health indicators, fault codes, cohort life curves',runs:'Daily, 04:00 IST'},
 {id:'recov',name:'Supplier recovery agent',does:'Matches claims to supplier responsibility and prepares the recovery file for claims not yet charged back.',inputs:'Claims, lot traceability, confirmed causes',runs:'Weekly, Wednesday'},
 {id:'recall',name:'Recall prioritiser',does:'For safety-related issues, scopes the affected population and orders vehicles by failure probability and time to failure.',inputs:'Predictions, severity, usage, stock position',runs:'Daily, 05:00 IST'}];
const FINDINGS=[];
// Shared by the agents page and the issue analysis screen: everything the data says about one cluster of failures.
function clusterEvidence(models,comp,I){const pop=INSVC.filter(v=>models.includes(v.model));
 const cl=CLAIMS.filter(x=>models.includes(FLEET[x.v].model)&&(I?x.issue===I.id||x.trueComp===comp||x.comp===comp:x.comp===comp));
 const hit=new Set(cl.map(x=>x.v)),fs=factorLift(pop,hit,comp),iso=isolate(pop,hit,comp);
 // Precursor code: the code seen before the claim on the largest share of failed vehicles, and its median lead.
 const pre=new Map(),first=cl.filter(x=>!x.repeatOf&&x.failDay<DTC_WINDOW-60);
 for(const x of first){const m=new Map();for(const e of FLEET[x.v].dtcs)if(e.day>x.failDay+1&&e.day<x.failDay+220)m.set(e.code,Math.max(m.get(e.code)||0,e.day));for(const [code,d] of m){let g=pre.get(code);if(!g){g=[];pre.set(code,g);}g.push(d-x.failDay);}}
 const pcs=[...pre.entries()].map(([code,l])=>({code,def:DTC[code].def,share:Math.min(100,pct(l.length,first.length||1)),lead:r0(quant(l,.5)),n:l.length})).filter(p=>p.n>=4&&p.share>=25).sort((a,b)=>b.lead-a.lead);
 let openN=0,openW=0,e90=0,n30=0;if(I)for(const v of pop){const a=v.iss.find(x=>x.id===I.id&&!x.fixed);if(!a)continue;openN++;openW+=v.w;const p=predOf(v,I.comp);if(p&&p.driver===I.id){e90+=p.p[2]*v.w;if(p.p[0]>=.5)n30+=v.w;}}
 return{pop,cl,hit,fs,iso,pcs,pc:pcs[0]||null,openN,openW:r0(openW),e90:r0(e90),n30:r0(n30),claimsW:r0(sum(cl.map(claimW))),cost:sum(cl.map(c=>c.total*claimW(c))),nff:pct(cl.filter(x=>x.nff).length,cl.length),repeat:pct(cl.filter(x=>x.repeatOf).length,cl.length)};}
(function mine(){
 const clusters=groupBy(ALERTS,a=>a.issue||a.model+'|'+a.comp);
 for(const [k,al] of clusters){const I=ISSUE[k]||null,models=I?I.models:[al[0].model],c=I?I.comp:al[0].comp,C=COMP[c],mn=models.map(m=>MODEL[m].name).join(', ');
  const E=clusterEvidence(models,c,I);if(E.cl.length<6)continue;
  const sources=uniq(al.map(a=>a.source)),kd=al.find(a=>a.kpi),acts=[],iso=E.iso,claimed=top(countBy(E.cl,x=>x.comp),1)[0][0];
  if(!I||I.status==='Emerging')acts.push({type:'Open issue',text:`Open a quality issue for ${C.name.toLowerCase()} on ${mn} and assign it to the ${OWNER_OF[c].toLowerCase()}`});
  acts.push({type:'Root cause',text:`Run AI root cause on ${Math.min(5,E.hit.size)} failed vehicles against healthy peers`});
  if(iso&&(iso.f1.kind==='Supplier'||(iso.f2&&iso.f2.kind==='Supplier')))acts.push({type:'Supplier',text:`Hold stock from ${(iso.f1.kind==='Supplier'?iso.f1:iso.f2).val} built in the affected window and request a teardown report`});
  if(iso&&(iso.f1.kind==='Plant'||(iso.f2&&iso.f2.kind==='Plant')))acts.push({type:'Plant',text:`Audit ${(iso.f1.kind==='Plant'?iso.f1:iso.f2).val} for the build window and pull end-of-line records`});
  if(iso&&iso.f1.kind==='Software')acts.push({type:'Software',text:`Review ${iso.f1.dim.toLowerCase()} ${iso.f1.val} and plan a corrective update`});
  if(E.nff>=30)acts.push({type:'Service',text:`Issue a service note: stop replacing the ${COMP[claimed].name.toLowerCase()} for this symptom`});
  if(C.safety>=3)acts.push({type:'Recall',text:'Add to the recall watch list and prepare the risk-ranked vehicle list'});
  if(E.n30)acts.push({type:'Predictive',text:`Bring in ${num(E.n30)} vehicles likely to fail within 30 days`});
  const lead=E.pc?`Fault code ${E.pc.code} appears a median of ${E.pc.lead} days before the claim, on ${E.pc.share}% of failed vehicles.`:kd?`${KPI_IDX[kd.kpi].name} moves before any fault code is set.`:'No reliable precursor found in fault codes.';
  FINDINGS.push({id:'',agent:E.nff>=50?'nff':sources.some(x=>['Warranty claims','Supplier lot','Plant process','Software version','Fault codes','Launch monitor'].includes(x))?'miner':'pred',models,modelName:mn,seg:MODEL[models[0]].seg,comp:c,compName:C.name,issue:I?I.id:null,known:!!I&&I.status!=='Emerging',
   title:`${C.name} on ${mn}: ${iso?iso.text:'pattern not yet isolated'}`,
   summary:[`${num(E.claimsW)} claims so far, ${inr(E.cost)}. ${sources.length===1?'One signal so far':sources.length+' independent signals agree'}: ${sources.join(', ').toLowerCase()}.`,
    iso?`${iso.cover}% of failures come from vehicles where ${iso.text}. ${iso.rate}% of that group has failed, against ${pct(E.hit.size,E.pop.length)}% for the whole population.`:'Failures are spread across the population.',lead,
    iso&&iso.f1.kind==='Build'&&!iso.f2&&iso.f1.from<=2?'Older builds have had more time to fail. Check the rate at equal months in service before treating the build window as a cause.':'',
    E.nff>=30?`${E.nff}% of the claims were no-fault-found and ${E.repeat}% were repeat visits: the part being replaced is not the cause.`:'',
    I&&E.openW?`${num(E.openW)} vehicles in the affected group have not failed yet; ${num(E.e90)} more failures are expected within 90 days.`:''].filter(Boolean),
   factors:E.fs.slice(0,7),rule:iso,precursor:E.pc,claims:E.claimsW,cost:r0(E.cost),nff:E.nff,sources,alerts:al.map(a=>a.id),severity:al[0].severity,safety:C.safety,confidence:E.fs.length&&E.fs[0].z>=6?'High':E.fs.length&&E.fs[0].z>=3.5?'Medium':'Low',actions:acts,day:Math.min(...al.map(a=>a.day)),spark:weekly(E.cl.filter(x=>x.day<182).map(x=>x.day),null,26)});
 }
 // Supplier recovery finding
 const unrec=CLAIMS.filter(c=>c.recoverable&&c.recState!=='Recovered'&&c.status==='Approved'),bySup=top(countBy(unrec,c=>SUPPLIERS[FLEET[c.v].lots[c.comp].split('-')[0]],c=>c.recoverable*claimW(c)),4);
 FINDINGS.push({id:'',agent:'recov',models:[],modelName:'All models',seg:null,comp:null,compName:'Supplier recovery',issue:null,known:false,title:`${inr(sum(unrec.map(c=>c.recoverable*claimW(c))))} of supplier-responsible claims not yet recovered`,
  summary:[`${num(sum(unrec.map(claimW)))} approved claims trace to a supplier-responsible cause and have not been recovered.`,`Largest open amounts: ${bySup.map(s=>s[0]+' '+inr(s[1])).join('; ')}.`,'Recovery files are drafted with claim, lot and failure evidence attached.'],factors:[],rule:null,precursor:null,claims:r0(sum(unrec.map(claimW))),cost:r0(sum(unrec.map(c=>c.recoverable*claimW(c)))),nff:0,sources:['Warranty claims','Supplier lot'],alerts:[],severity:'Medium',safety:0,confidence:'High',
  actions:bySup.slice(0,3).map(s=>({type:'Supplier',text:`Send the recovery file to ${s[0]} for ${inr(s[1])}`})),day:2,spark:weekly(unrec.filter(c=>c.day<182).map(c=>c.day),null,26)});
 FINDINGS.sort((a,b)=>SEV.indexOf(a.severity)-SEV.indexOf(b.severity)||b.cost-a.cost);
 FINDINGS.forEach((f,i)=>{f.id='F-'+String(i+1).padStart(2,'0');f.actions.forEach((a,j)=>a.id=f.id+'-'+(j+1));});
})();
