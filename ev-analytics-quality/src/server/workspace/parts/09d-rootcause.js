/* ===== Queries, part 4: the comparison workbench, pattern search, no-fault-found and repeat repair, and issue-level root cause ===== */
// A side of a comparison is either one vehicle or a population picked by filters and health state.
function side(spec){spec=spec||{};if(spec.kind==='vin'){const v=vfind(spec.vin);if(!v||!v.inService)return null;return{kind:'vin',v,vs:[v],label:v.vin+' ('+MODEL[v.model].name+')',n:1,w:v.w};}
 let vs=csel(spec.f||{},INSVC);const h=spec.health||'';if(h==='good')vs=vs.filter(isGood);else if(h==='failed')vs=vs.filter(u=>u.claims.length>0);else if(h==='risk')vs=vs.filter(u=>u.pred.some(x=>x.driver!=='Wear and age'&&x.p90>=.5));
 if(vs.length<5)return null;return{kind:'pop',vs,sample:stride(vs,500),label:cohortText(spec.f||{})+(h==='good'?', healthy only':h==='failed'?', with a claim':h==='risk'?', at risk':''),n:vs.length,w:r0(WSUM(vs))};}
const parseSpec=s=>{try{return typeof s==='string'?JSON.parse(s):s||{};}catch(e){return{};}};
function sideStats(S,K,trip){if(S.kind==='vin'){if(trip){const a=Array.from({length:20},(_,t)=>kv(S.v,K,t,20));return{m:mean(a),s:sdev(a)||K.sd*.3,n:20};}return{m:kv(S.v,K),s:K.sd*.8,n:1};}
 const smp=trip?stride(S.sample,160):S.sample,a=trip?smp.flatMap(u=>[5,12,19].map(t=>kv(u,K,t,20))):smp.map(u=>kv(u,K));return{m:mean(a),s:sdev(a)||K.sd*.5,n:a.length,a};}
function compare(A,B,trip){const rows=[],segs=uniq(A.vs.concat(B.vs.slice(0,200)).map(v=>v.seg)),models=uniq(A.vs.slice(0,300).map(v=>v.model));
 for(const K of KPIS){if(K.comp&&segs.some(s=>COMP[K.comp].exclude.includes(s)))continue;const a=sideStats(A,K,trip),b=sideStats(B,K,trip);
  let z;if(A.kind==='vin'&&B.kind==='pop')z=(a.m-b.m)/b.s;else if(A.kind==='pop'&&B.kind==='vin')z=(a.m-b.m)/a.s;else if(A.kind==='vin'&&B.kind==='vin')z=(a.m-b.m)/(K.sd*1.13);else z=(a.m-b.m)/Math.sqrt((a.s*a.s+b.s*b.s)/2)*3;
  // Two populations can have close averages while a subgroup of one sits far outside the other's normal range.
  let tailA=null,tailB=null;if(A.kind==='pop'&&B.kind==='pop'&&a.a&&b.a){const hiT=b.m+2*b.s,loT=b.m-2*b.s,out=K.dir==='hi'?x=>x>hiT:K.dir==='lo'?x=>x<loT:x=>x>hiT||x<loT;tailA=r1(a.a.filter(out).length/a.a.length*100);tailB=r1(b.a.filter(out).length/b.a.length*100);}
  const bad=K.dir?(K.dir==='lo'?-z:z):Math.abs(z),flag=Math.abs(z)>=3?'Large':Math.abs(z)>=2?'Notable':tailA!==null&&tailA>=6&&tailA>=3*Math.max(tailB,1.5)?'Subgroup':'';
  rows.push({key:K.key,name:K.name,cat:K.cat,catName:SIGCATS[K.cat],unit:K.unit,comp:K.comp,dir:K.dir,a:+a.m.toFixed(K.dp),b:+b.m.toFixed(K.dp),diff:+(a.m-b.m).toFixed(K.dp),pct:Math.abs(b.m)>1e-9?r1((a.m-b.m)/Math.abs(b.m)*100):null,z:r1(z),bad:r1(flag==='Subgroup'?Math.max(bad,2):bad),flag,tailA,tailB});}
 const fl=rows.filter(r=>r.flag).sort((x,y)=>Math.abs(y.z)+(y.tailA||0)/10-Math.abs(x.z)-(x.tailA||0)/10);
 // Which known issue the flagged health indicators point to.
 const votes=ISSUES.filter(i=>models.some(m=>i.models.includes(m))).map(i=>{const k=i.sig.filter(s=>{const r=rows.find(r=>r.key===s[0]);return r&&((s[1]>0&&r.z>=2)||(s[1]<0&&r.z<=-2)||r.flag==='Subgroup');}).length;return{id:i.id,name:i.name,k,of:i.sig.length};}).filter(x=>x.k>=2||(x.k>=1&&x.of<=2)).sort((x,y)=>y.k/y.of-x.k/x.of);
 for(const r of fl){const up=r.z>0,t=[`${r.name}: ${r.a} ${r.unit} for A against ${r.b} for B${r.pct!==null?' ('+(up?'+':'')+r.pct+'%)':''}.`];
  if(r.flag==='Subgroup')t.push(`The averages are close, but ${r.tailA}% of A's vehicles sit outside B's normal range against ${r.tailB}% of B's: a subgroup of A is drifting.`);
  if(r.comp){t.push(`Health indicator for the ${COMP[r.comp].name.toLowerCase()}; ${r.bad>0?'A is on the bad side':'A is on the good side'}.`);const ks=ISSUES.filter(i=>i.sigMap[r.key]&&models.some(m=>i.models.includes(m)));if(ks.length&&r.bad>0)t.push('Known precursor of '+ks.map(i=>i.id).join(', ')+'.');}
  else t.push(`Trip measure in "${SIGCATS[r.cat]}".`);r.note=t.join(' ');}
 const bySys=SIGCATS.map((n,i)=>{const rs=rows.filter(r=>r.cat===i);return{cat:i,name:n,total:rs.length,large:rs.filter(r=>r.flag==='Large').length,notable:rs.filter(r=>r.flag==='Notable'||r.flag==='Subgroup').length};}).filter(s=>s.total);
 const hot=[...bySys].sort((x,y)=>(y.large*2+y.notable)/y.total-(x.large*2+x.notable)/x.total).filter(s=>s.large+s.notable>0).slice(0,3),comps=top(countBy(fl.filter(r=>r.comp&&r.bad>0),r=>COMP[r.comp].name),3);
 const sub=fl.filter(r=>r.flag==='Subgroup').length,findings=[];findings.push(fl.length?`${fl.length} of ${rows.length} KPIs stand out: ${fl.filter(r=>r.flag==='Large').length} large, ${fl.filter(r=>r.flag==='Notable').length} notable${sub?`, and ${sub} where the averages are close but a subgroup of A sits outside B's normal range`:''}.`:`None of the ${rows.length} KPIs stands out. The two sides behave alike.`);
 if(hot.length)findings.push('The differences concentrate in: '+hot.map(s=>`${s.name} (${s.large+s.notable} of ${s.total})`).join('; ')+'.');
 if(comps.length)findings.push('Component health indicators on the bad side for A: '+comps.map(c=>c[0].toLowerCase()+' ('+c[1]+')').join(', ')+'.');
 if(votes.length)findings.push(`The pattern matches ${votes[0].id} (${votes[0].name.toLowerCase()}): ${votes[0].k} of its ${votes[0].of} precursor indicators are shifted the expected way.`);else if(comps.length)findings.push('No known issue has this signature. Treat it as a new pattern and inspect the '+comps[0][0].toLowerCase()+' first.');
 if(fl.length&&!comps.length)findings.push('Only trip and usage measures differ, not component health. This looks like a difference in how the vehicles are used, not a fault.');
 return{rows,flagged:fl.length,large:fl.filter(r=>r.flag==='Large').length,bySys,findings,match:votes[0]||null,top:fl.slice(0,15)};}
Q.ev_q_compare=p=>{const A=side(parseSpec(p.a)),B=side(parseSpec(p.b)),trip=p.level==='trip';if(!A)return{error:'Side A has no usable vehicles. Enter a VIN that is in service, or widen the filters (at least five vehicles).'};if(!B)return{error:'Side B has no usable vehicles. Enter a VIN that is in service, or widen the filters (at least five vehicles).'};
 const c=compare(A,B,trip);return{A:{label:A.label,kind:A.kind,n:A.n,w:r0(A.w)},B:{label:B.label,kind:B.kind,n:B.n,w:r0(B.w)},level:trip?'Trip level (last 20 trips)':'Aggregate (vehicle averages)',...c};};
Q.ev_q_kpi_detail=p=>{const A=side(parseSpec(p.a)),B=side(parseSpec(p.b)),K=KPI_IDX[p.key];if(!A||!B||!K)return{error:'Pick a KPI from the table.'};
 const vals=S=>S.kind==='vin'?[kv(S.v,K)]:S.sample.map(u=>kv(u,K)),va=vals(A),vb=vals(B),all=va.concat(vb),lo=Math.min(quant(all,.005),...(A.kind==='vin'?va:[])),hi=Math.max(quant(all,.995),...(A.kind==='vin'?va:[])),n=22,wd=(hi-lo)/n||1;
 const hist=a=>{const c=Array(n).fill(0);a.forEach(x=>c[clamp(Math.floor((x-lo)/wd),0,n-1)]++);return c.map(x=>r1(x/(a.length||1)*100));};
 const tripS=S=>S.kind==='vin'?Array.from({length:20},(_,t)=>kv(S.v,K,t,20)):null,bt=B.kind==='pop'?stride(B.sample,120).flatMap(u=>[17,18,19].map(t=>kv(u,K,t,20))):null;
 const weeks=Array.from({length:26},(_,i)=>(25-i)*7),tr=S=>S.kind==='vin'?weeks.map(d=>d>S.v.saleDay?null:+clamp(K.base+kzAt(S.v,K,d)*K.sd,K.lo,K.hi).toFixed(K.dp)):null;
 const ks=ISSUES.filter(i=>i.sigMap[K.key]);
 return{key:K.key,name:K.name,desc:K.desc,unit:K.unit,cat:SIGCATS[K.cat],comp:K.comp?COMP[K.comp].name:null,dir:K.dir,range:[K.lo,K.hi],typical:K.base,precursorOf:ks.map(i=>i.id+' '+i.name),
  bins:Array.from({length:n},(_,b)=>+(lo+wd*(b+.5)).toFixed(K.dp)),histA:A.kind==='pop'?hist(va):null,histB:B.kind==='pop'?hist(vb):null,aVal:A.kind==='vin'?va[0]:+mean(va).toFixed(K.dp),bVal:B.kind==='vin'?vb[0]:+mean(vb).toFixed(K.dp),
  trips:{a:tripS(A),b:tripS(B),band:bt?[+quant(bt,.1).toFixed(K.dp),+quant(bt,.9).toFixed(K.dp)]:null},weekly:{x:weeks.map(d=>dnice(d).replace(/ \d{4}$/,'')),a:tr(A),b:tr(B)}};};

// Pattern search: vehicles that meet up to four KPI conditions, and what became of them.
Q.ev_q_pattern=p=>{const conds=(parseSpec(p.conds)||[]).filter?parseSpec(p.conds).filter(c=>c&&KPI_IDX[c[0]]&&c[2]!==''&&c[2]!==null&&!isNaN(+c[2])):[];const pop=csel(parseSpec(p.f)||{},INSVC);
 if(!conds.length)return{conds:[],n:0,rows:[],kpis:HKPIS.map(K=>[K.key,K.name,K.unit,K.base]).concat(KPIS.filter(k=>k.src==='trip').slice(0,400).map(K=>[K.key,K.name,K.unit,K.base]))};
 const ok=(v,c)=>{const K=KPI_IDX[c[0]];if(!kpiApplies(K,v))return false;const x=kv(v,K);return c[1]==='>'?x>+c[2]:c[1]==='<'?x<+c[2]:Math.abs(x-+c[2])<=K.sd;};
 const hit=pop.filter(v=>conds.every(c=>ok(v,c))),ids=new Set(hit.map(v=>v.i)),claimed=hit.filter(v=>v.claims.length),risk=hit.filter(v=>v.pred.some(x=>x.driver!=='Wear and age'&&x.p90>=.5));
 const mp=pop.filter(v=>hit.some(h=>h.model===v.model)),iso=hit.length>=5&&mp.length>hit.length?isolate(mp,ids,KPI_IDX[conds[0][0]].comp||'bat'):null;
 return{conds:conds.map(c=>[KPI_IDX[c[0]].name,c[1],c[2],KPI_IDX[c[0]].unit]),n:hit.length,w:r0(WSUM(hit)),share:pct(hit.length,pop.length),claimed:pct(claimed.length,hit.length),baseClaimed:pct(pop.filter(v=>v.claims.length).length,pop.length),risk:pct(risk.length,hit.length),
  byModel:top(countBy(hit,v=>MODEL[v.model].name,v=>v.w),8).map(([k,n])=>[k,r0(n)]),byIssue:top(countBy(hit.flatMap(v=>v.iss.filter(a=>!a.fixed).map(a=>a.id)),x=>x),6),comps:top(countBy(claimed.flatMap(v=>v.claims.slice(0,1)),c=>COMP[c.comp].name),6),rule:iso?iso.text:null,
  rows:hit.slice(0,80).map(v=>{const b=v.pred[0];return[v.vin,MODEL[v.model].name,v.city,mlabel(v.buildM),...conds.map(c=>kv(v,KPI_IDX[c[0]])),v.claims.length,b&&b.driver!=='Wear and age'?COMP[b.comp].name+' '+r0(b.p[2]*100)+'%':'Low'];}),cols:conds.map(c=>KPI_IDX[c[0]].name)};};

Q.ev_q_nff=p=>{const cl=claimsOf(p),c12=cl.filter(c=>c.day<365),nf=c12.filter(c=>c.nff),rep=c12.filter(c=>c.repeatOf),pop=svcPop(p);
 const byComp=COMPS.map(C=>{const cc=c12.filter(c=>c.comp===C.id),n=cc.filter(c=>c.nff);return{comp:C.id,name:C.name,claims:r0(wcl(cc)),nff:pct(n.length,cc.length),repeat:pct(cc.filter(c=>c.repeatOf).length,cc.length),cost:r0(costW(n)),n:cc.length};}).filter(r=>r.n>=8).sort((a,b)=>b.cost-a.cost);
 // What was replaced against what was actually wrong, where a later correct repair or a confirmed issue tells us.
 const links=new Map();for(const c of nf){const t=c.issue?COMP[ISSUE[c.issue].comp].name+(ISSUE[c.issue].causeType==='Software'?' software':ISSUE[c.issue].causeType==='Assembly process'?' assembly':''):'Cause not found';const k='Replaced: '+COMP[c.comp].name+'|'+'True cause: '+t;links.set(k,(links.get(k)||0)+claimW(c));}
 const L=top(links,12).map(([k,n])=>{const [a,b]=k.split('|');return[a,b,r0(n)];});
 const dealers=[...groupBy(c12,c=>c.dealer).entries()].filter(([d,cs])=>cs.length>=8).map(([d,cs])=>({dealer:d,claims:cs.length,nff:pct(cs.filter(c=>c.nff).length,cs.length),repeat:pct(cs.filter(c=>c.repeatOf).length,cs.length),cost:r0(sum(cs.filter(c=>c.nff).map(c=>c.total*claimW(c))))})).sort((a,b)=>b.nff-a.nff);
 const chains=pop.filter(v=>v.claims.filter(c=>c.repeatOf).length>=1).map(v=>{const cs=[...v.claims].sort((a,b)=>b.day-a.day),a=v.iss.find(x=>cs.some(c=>c.issue===x.id)),I=a&&ISSUE[a.id];let pointer='No telemetry pointer',kpi='';
   if(I){const s=I.sig[0],K=KPI_IDX[s[0]];pointer=COMP[I.comp].name+(I.causeType==='Software'?' (software)':'');kpi=K.name+' '+(a.fixed?'was':'is')+' the indicator to check';}
   return{vin:v.vin,model:MODEL[v.model].name,city:v.city,visits:cs.length,parts:uniq(cs.map(c=>COMP[c.comp].name)).join(', '),cost:sum(cs.map(c=>c.total)),first:dstr(cs[0].day),last:dstr(cs[cs.length-1].day),state:a?(a.fixed?'Fixed at last visit':'Still not fixed'):'Fixed',pointer,kpi,issue:I?I.id:''};}).sort((a,b)=>b.visits-a.visits||b.cost-a.cost);
 const months=Array.from({length:12},(_,i)=>24+i);
 return{selection:cohortText(p),kpis:{nffRate:pct(nf.length,c12.length),repeatRate:pct(rep.length,c12.length),cost:r0(costW(nf)),vehicles:r0(WSUM(chains.map(c=>vfind(c.vin)))),open:chains.filter(c=>c.state==='Still not fixed').length,explained:pct(nf.filter(c=>c.issue).length,nf.length)},
  byComp,links:L,dealers:dealers.slice(0,25),chains:chains.slice(0,60),trend:{x:months.map(mlabel),nff:months.map(m=>{const cc=cl.filter(c=>monthOfDay(c.day)===m);return pct(cc.filter(c=>c.nff).length,cc.length);}),repeat:months.map(m=>{const cc=cl.filter(c=>monthOfDay(c.day)===m);return pct(cc.filter(c=>c.repeatOf).length,cc.length);})}};};

Q.ev_q_issues=()=>({issues:ISSUES.map(I=>{const s=ISTAT[I.id];return{id:I.id,name:I.name,status:I.status,safety:I.safety,comp:COMP[I.comp].name,compId:I.comp,models:I.models.map(m=>MODEL[m].name).join(', '),modelIds:I.models,owner:I.owner,causeType:I.causeType,affW:r0(s.affW),openW:r0(s.openW),claimsW:s.claimsW,cost:r0(s.cost),e90:s.e90,n30:s.n30,lead:s.lead,nff:s.nff,handover:HANDOVER[I.id]||''};}),
 clusters:FINDINGS.filter(f=>!f.issue&&f.comp).map(f=>({key:f.models[0]+'|'+f.comp,title:f.title}))});
const HYP=[['Supplier part','A part or material from a supplier is out of specification',['Supplier']],['Assembly process','A plant process step was missed or drifted',['Plant']],['Software','A software or calibration release introduced the fault',['Software']],['Design margin','The design has too little margin for some duty or climate',['Usage']],['Age and wear','Normal wear-out reached earlier by older or harder-used vehicles',['Build']]];
Q.ev_q_issue=p=>{let I=ISSUE[p.id]||null,models,comp;if(I){models=I.models;comp=I.comp;}else{const [m,c]=String(p.key||'').split('|');if(!MODEL[m]||!COMP[c])return{error:'Choose an issue.'};models=[m];comp=c;}
 const C=COMP[comp],E=clusterEvidence(models,comp,I),s=I?ISTAT[I.id]:null,w=SEG[MODEL[models[0]].seg].fleet/SEG[MODEL[models[0]].seg].sample;
 const inRule=E.iso?E.pop.filter(E.iso.test):[],rest=E.iso?E.pop.filter(v=>!E.iso.test(v)):E.pop,first=E.cl.filter(c=>!c.repeatOf);
 // Hypotheses ranked by how strongly the factors of each kind separate failed from healthy vehicles.
 const kindZ=k=>Math.max(0,...E.fs.filter(f=>k.includes(f.kind)).map(f=>f.z*(.5+f.cover/200)));
 let hyp=HYP.map(h=>{const z=kindZ(h[2]),f=E.fs.filter(x=>h[2].includes(x.kind)).sort((a,b)=>b.z-a.z)[0];return{type:h[0],text:h[1],z,evidence:f?`${f.dim} = ${f.val}: ${f.rate}% failed against ${f.rest}% elsewhere (${f.cover}% of failures)`:'No factor of this kind separates failed vehicles'};});
 if(E.nff>=30)hyp.push({type:'Wrong part replaced',text:'The claimed part is not the cause; the fault lies in another component or in software',z:E.nff/6,evidence:`${E.nff}% of claims are no-fault-found and ${E.repeat}% are repeat visits`});
 // A build window with a supplier inside it points to the supplier; with a line or shift inside it, to the plant.
 if(E.iso&&E.iso.f1.kind==='Build'&&E.iso.f2){const t=E.iso.f2.kind==='Supplier'?'Supplier part':E.iso.f2.kind==='Plant'?'Assembly process':null,h=hyp.find(x=>x.type===t);if(h)h.z+=E.iso.f1.z*.6;const age=hyp.find(x=>x.type==='Age and wear');age.z*=.3;}
 const zt=sum(hyp.map(h=>h.z))||1;hyp=hyp.map(h=>({...h,conf:r0(h.z/zt*100)})).sort((a,b)=>b.conf-a.conf);
 const fish=[['Material (supplier and lot)',['Supplier']],['Method and machine (plant line)',['Plant']],['Build period',['Build']],['Software and calibration',['Software']],['Environment and usage',['Usage']]].map(([n,k])=>{const f=E.fs.filter(x=>k.includes(x.kind)).slice(0,3);return{name:n,items:f.map(x=>`${x.dim} = ${x.val} (${x.rr}x, ${x.cover}% of failures)`)};});
 const kp=HKPIS.map((K,i)=>({K,i})).filter(o=>!COMP[o.K.comp].exclude.includes(MODEL[models[0]].seg)).map(o=>{const open=E.pop.filter(v=>I?v.iss.some(a=>a.id===I.id&&!a.fixed&&a.p>.3):E.hit.has(v.i)),f=mean(open.map(v=>v.hz[o.i])),r=mean(stride(rest,600).map(v=>v.hz[o.i]));return{name:o.K.name,comp:COMP[o.K.comp].name,aff:r2(f),rest:r2(r),gap:r2(f-r)};}).sort((a,b)=>b.gap-a.gap).slice(0,6);
 const months=Array.from({length:24},(_,i)=>i+12),mc=months.map(m=>r0(E.cl.filter(c=>monthOfDay(c.day)===m).length*w));
 const tl=[];if(I&&s){if(s.lead)tl.push(['First health-indicator drift',`About ${r0(s.lead*I.sigLead/I.lead)} days before a typical failure`,'Signal drift']);if(s.lead)tl.push(['First fault code in the sequence',`Median ${s.lead} days before the claim`,'Fault codes']);tl.push(['First warranty claim',dnice(s.firstClaim),'Warranty claims']);if(s.opened)tl.push(['Case opened',dnice(s.opened),'Quality']);tl.push(['Today',`${num(s.openW)} vehicles still at risk`,'']);}
 const steps=['Team formed','Problem described','Containment in place','Root cause confirmed','Countermeasure chosen','Countermeasure in field','Recurrence prevented','Closed'],done=I?{Emerging:0,Investigating:3,'Root cause confirmed':5,'Countermeasure in field':6,Monitoring:7}[I.status]:0;
 const samp=E.pop.filter(v=>I?v.iss.some(a=>a.id===I.id&&!a.fixed):E.hit.has(v.i)).sort((a,b)=>{const pa=predOf(a,comp),pb=predOf(b,comp);return(pb?pb.p90:0)-(pa?pa.p90:0);}).slice(0,6);
 return{id:I?I.id:null,name:I?I.name:C.name+' on '+models.map(m=>MODEL[m].name).join(', '),status:I?I.status:'No case yet',safety:C.safety,comp:C.name,compId:comp,models:models.map(m=>MODEL[m].name).join(', '),modelIds:models,owner:I?I.owner:OWNER_OF[comp],
  known:I?{mode:I.mode,cause:I.cause,causeType:I.causeType,fix:I.fix,confirmed:['Root cause confirmed','Countermeasure in field','Monitoring'].includes(I.status)}:null,
  kpis:{claims:E.claimsW,cost:r0(E.cost),vehicles:r0(E.hit.size*w),open:E.openW,e90:E.e90,n30:E.n30,nff:E.nff,repeat:E.repeat,lead:s?s.lead:null,avgCost:E.cl.length?r0(mean(E.cl.map(c=>c.total))):0},
  factors:E.fs,rule:E.iso?{text:E.iso.text,n:E.iso.n,w:r0(E.iso.w),rate:E.iso.rate,cover:E.iso.cover,restRate:pct(rest.filter(v=>E.hit.has(v.i)).length,rest.length)}:null,hyp,fish,
  precursors:E.pcs.slice(0,6),indicators:kp,timeline:tl,
  mis:{x:Array.from({length:24},(_,i)=>i+1),inRule:E.iso?misCurve(inRule,first,24):null,rest:misCurve(rest,first,24)},monthly:{x:months.map(mlabel),v:mc},
  tile:stateTile(E.pop,vs=>r1(vs.filter(v=>E.hit.has(v.i)).length/vs.length*100)),
  usage:top(countBy(E.pop.filter(v=>E.hit.has(v.i)),v=>v.usage),6).map(([k,n])=>{const d=E.pop.filter(v=>v.usage===k).length||1;return[k,r1(n/d*100)];}),
  symptoms:top(countBy(E.cl,c=>c.symptom,claimW),5).map(([k,n])=>[k,r0(n)]),replaced:top(countBy(E.cl,c=>COMP[c.comp].name,claimW),4).map(([k,n])=>[k,r0(n)]),
  eightD:steps.map((t,i)=>[t,i<done?'Done':i===done?'In progress':'Not started']),
  bulletins:BULLETINS.filter(b=>b[2]===comp&&b[3].some(m=>models.includes(m))).map(b=>({id:b[0],title:b[1],date:b[4],summary:b[5],action:b[6]})),
  pastCases:PASTCASES.filter(c=>c[2]===comp||(I&&c[3]===I.causeType)).slice(0,3).map(c=>({id:c[0],title:c[1],type:c[3],cause:c[4],time:c[5],lesson:c[6]})),
  samples:samp.map(v=>{const pr=predOf(v,comp);return[v.vin,v.city,mlabel(v.buildM),pr?r0(pr.p[2]*100)+'%':'Low',pr?pr.ttf:'',v.claims.length];}),
  claims:E.cl.slice(0,80).map(c=>{const v=FLEET[c.v];return[c.id,dstr(c.day),v.vin,MODEL[v.model].name,v.city,c.mis,COMP[c.comp].name,c.symptom,c.nff?'Yes':'No',c.repeatOf?'Yes':'No',c.total];})};};
