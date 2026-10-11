/* ===== Queries, part 2: early warning. Claims, fault codes, signal drift and the launch monitor. ===== */
// One row per model and component: how the last 90 days of claims compare with the 270 days before, and which earlier signals have fired.
function emerging(p){const rows=[];
 for(const M of MODELS){if(p.model&&p.model!==M.id)continue;if(p.seg&&p.seg!==M.seg)continue;const pop=csel(p,INSVC).filter(v=>v.model===M.id);if(pop.length<25)continue;const ids=new Set(pop.map(v=>v.i)),w=SEG[M.seg].fleet/SEG[M.seg].sample;
  const expR=pop.filter(v=>v.saleDay>45).length||1,expP=pop.filter(v=>v.saleDay>225).length||1,mcl=CLAIMS.filter(c=>ids.has(c.v));
  for(const C of COMPS){if(C.exclude.includes(M.seg)||(p.comp&&p.comp!==C.id))continue;const cl=mcl.filter(c=>c.comp===C.id),nR=cl.filter(c=>c.day<90),nP=cl.filter(c=>c.day>=90&&c.day<360).length;
   const al=ALERTS.filter(a=>a.model===M.id&&a.comp===C.id);if(nR.length<3&&!al.length)continue;
   const E=Math.max(.6,nP/expP/3*expR),z=(nR.length-E)/Math.sqrt(E),I=issueFor(M.id,C.id),src=s=>al.some(a=>a.source===s);
   rows.push({model:M.id,modelName:M.name,seg:SEG[M.seg].name,comp:C.id,compName:C.name,safety:C.safety,claims90:r0(nR.length*w),rate:r1(nR.length/expR*1000),expected:r1(E/expR*1000),ratio:r1(nR.length/E),z:r1(z),cost90:r0(sum(nR.map(c=>c.total))*w),
    sClaims:src('Warranty claims')||src('Supplier lot')||src('Plant process')||src('Software version'),sCodes:src('Fault codes'),sDrift:src('Signal drift'),sPred:src('Predictive'),sNff:src('No-fault-found'),signals:uniq(al.map(a=>a.source)).length,
    severity:al.length?al[0].severity:'None',issue:I?I.id:null,status:I?I.status:al.length?'No case yet':'Normal variation',spark:weekly(cl.filter(c=>c.day<182).map(c=>c.day),null,26)});}}
 return rows.sort((a,b)=>b.signals-a.signals||b.z-a.z);}
Q.ev_q_ew_overview=p=>{const rows=emerging(p),flag=rows.filter(r=>r.signals>0),pop=svcPop(p),cl=claimsOf(p);
 const wk=Array.from({length:26},(_,i)=>i),x=wk.map(i=>dnice((25-i)*7).replace(/ \d{4}$/,''));
 const linked=weekly(cl.filter(c=>c.day<182&&c.issue).map(c=>c.day),cl.filter(c=>c.day<182&&c.issue).map(claimW),26),other=weekly(cl.filter(c=>c.day<182&&!c.issue).map(c=>c.day),cl.filter(c=>c.day<182&&!c.issue).map(claimW),26);
 const comps=uniq(flag.map(r=>r.compName)),models=uniq(flag.map(r=>r.modelName));
 // What fires first: for each open issue, days of warning each source gives before the claim.
 const order=ISSUES.filter(I=>(!p.model||I.models.includes(p.model))&&(!p.seg||I.models.some(m=>MODEL[m].seg===p.seg))).map(I=>{const s=ISTAT[I.id];return{id:I.id,name:I.name,drift:I.seq.length&&s.lead?r0(s.lead*I.sigLead/I.lead):r0(I.sigLead*.7),codes:s.lead,claims:0};});
 return{selection:cohortText(p),rows,kpis:{watched:rows.length,flagged:flag.length,multi:flag.filter(r=>r.signals>=3).length,noCase:flag.filter(r=>!r.issue).length,claims90:r0(sum(flag.map(r=>r.claims90))),cost90:r0(sum(flag.map(r=>r.cost90))),earliest:order.length?Math.max(...order.map(o=>o.drift)):0},
  bubble:flag.map(r=>[r.ratio,cr(r.cost90),r.modelName+' · '+r.compName,clamp(6+r.claims90/400,7,34)]),
  heat:{x:models,y:comps,d:comps.map(c=>models.map(m=>{const r=flag.find(q=>q.compName===c&&q.modelName===m);return r?r.ratio:null;}))},
  weekly:{x,linked,other},bySource:top(countBy(ALERTS.filter(a=>(!p.seg||a.seg===p.seg)&&(!p.model||a.model===p.model)),a=>a.source),12),order};};

Q.ev_q_ew_issue=p=>{const M=MODEL[p.model],C=COMP[p.comp];if(!M||!C)return{error:'Choose a model and a component.'};const I=issueFor(M.id,C.id),pop=INSVC.filter(v=>v.model===M.id),w=SEG[M.seg].fleet/SEG[M.seg].sample;
 const cl=CLAIMS.filter(c=>FLEET[c.v].model===M.id&&c.comp===C.id),hit=new Set(cl.map(c=>c.v)),fs=factorLift(pop,hit,C.id),iso=isolate(pop,hit,C.id);
 const wk=52,x=Array.from({length:wk},(_,i)=>dnice((wk-1-i)*7).replace(/ \d{4}$/,'')),counts=weekly(cl.filter(c=>c.day<wk*7).map(c=>c.day),null,wk).map(n=>r0(n*w));
 // CUSUM against the mean of the first 26 weeks: a standard way to show when a rate started to move.
 const ref=mean(counts.slice(0,26)),sd=Math.max(1,sdev(counts.slice(0,26)));let s=0;const cusum=counts.map(n=>{s=Math.max(0,s+(n-ref-sd*.5)/sd);return r1(s);}),firstCross=cusum.findIndex(v=>v>=4);
 const inRule=iso?pop.filter(iso.test):[],out=iso?pop.filter(v=>!iso.test(v)):pop,inIds=new Set(inRule.map(v=>v.i));
 const codes=DTCS.filter(d=>d[2]===C.id||(I&&I.seq.includes(d[0]))).map(d=>d[0]),dev=DTCE.filter(e=>FLEET[e.v].model===M.id&&codes.includes(e.code));
 const kp=HKPIS.map((K,i)=>({K,i})).filter(o=>o.K.comp===C.id||(I&&I.sigMap[o.K.key])).map(o=>{const f=mean(pop.filter(v=>hit.has(v.i)||inIds.has(v.i)).map(v=>v.hz[o.i])),r=mean(out.map(v=>v.hz[o.i]));return[o.K.name,r2(f),r2(r)];}).sort((a,b)=>b[1]-a[1]).slice(0,6);
 return{model:M.name,comp:C.name,issue:I?{id:I.id,name:I.name,status:I.status}:null,
  kpis:{claims:r0(cl.length*w),cost:r0(sum(cl.map(c=>c.total))*w),vehicles:r0(hit.size*w),share:pct(hit.size,pop.length),nff:pct(cl.filter(c=>c.nff).length,cl.length),avgMis:r1(mean(cl.map(c=>c.mis)))},
  weekly:{x,counts,cusum,cross:firstCross>=0?x[firstCross]:null},factors:fs,rule:iso?{text:iso.text,w:r0(iso.w),rate:iso.rate,cover:iso.cover}:null,
  mis:{x:Array.from({length:18},(_,i)=>i+1),inRule:iso?misCurve(inRule,cl,18):null,rest:misCurve(out,cl,18)},
  tile:stateTile(pop,vs=>r1(vs.filter(v=>hit.has(v.i)).length/vs.length*100)),
  codes:top(countBy(dev.filter(e=>e.day<180),e=>e.code,e=>FLEET[e.v].w),6).map(([code,n])=>[code,DTC[code].def,r0(n)]),codeWeekly:{x:x.slice(26),v:weekly(dev.filter(e=>e.day<182).map(e=>e.day),null,26).map(n=>r0(n*w))},drift:kp,
  claims:cl.slice(0,60).map(c=>{const v=FLEET[c.v];return[c.id,dstr(c.day),v.vin,v.city,c.mis,c.odo,c.symptom,c.nff?'Yes':'No',c.total];})};};

Q.ev_q_dtc=p=>{const ev=dtcOf(p),pop=svcPop(p),W=WSUM(pop)||1,wOf=e=>FLEET[e.v].w,e30=ev.filter(e=>e.day<30),act=ev.filter(e=>e.st==='Active');
 const wk=26,x=Array.from({length:wk},(_,i)=>dnice((wk-1-i)*7).replace(/ \d{4}$/,'')),e182=ev.filter(e=>e.day<182);
 const byCode=groupBy(ev,e=>e.code),codes=[...byCode.entries()].map(([code,es])=>{const D=DTC[code],v30=uniq(es.filter(e=>e.day<30).map(e=>e.v)),vp=uniq(es.filter(e=>e.day>=30&&e.day<120).map(e=>e.v)).length/3,I=ISSUES.find(i=>i.seq.includes(code)&&(!p.model||i.models.includes(p.model)));
   return{code,def:D.def,comp:COMP[D.comp].name,sys:D.sys,crit:CRIT[D.crit],critN:D.crit,vehicles:r0(sum(uniq(es.map(e=>e.v)).map(i=>FLEET[i].w))),events:r0(sum(es.map(e=>e.n*wOf(e)))),active:r0(sum(uniq(es.filter(e=>e.st==='Active').map(e=>e.v)).map(i=>FLEET[i].w))),v30:r0(sum(v30.map(i=>FLEET[i].w))),ratio:r1(v30.length/Math.max(.7,vp)),issue:I?I.id:null,spark:weekly(es.filter(e=>e.day<182).map(e=>e.day),null,26)};}).sort((a,b)=>b.v30-a.v30);
 const tc=codes.slice(0,12).map(c=>c.code),ms=MODELS.filter(m=>pop.some(v=>v.model===m.id));
 // Sequences: code B first seen within 45 days after code A on the same vehicle.
 const seq=new Map(),firstBy=new Map();for(const e of ev){const k=e.v+'|'+e.code;if(!firstBy.has(k)||firstBy.get(k)<e.day)firstBy.set(k,e.day);}
 const perV=groupBy([...firstBy.entries()],x=>x[0].split('|')[0]);for(const [vi,list] of perV){if(list.length<2)continue;for(const a of list)for(const b of list){if(a===b)continue;const gap=a[1]-b[1];if(gap>0&&gap<=45){const k=a[0].split('|')[1]+'>'+b[0].split('|')[1];let g=seq.get(k);if(!g){g=[];seq.set(k,g);}g.push(gap);}}}
 const aCount=code=>uniq(ev.filter(e=>e.code===code).map(e=>e.v)).length;
 const sequences=[...seq.entries()].filter(([k,g])=>g.length>=5).map(([k,g])=>{const [a,b]=k.split('>');return[a,b,g.length,pct(g.length,aCount(a)),r0(quant(g,.5)),DTC[b].def,CRIT[DTC[b].crit]];}).sort((x,y)=>y[2]-x[2]).slice(0,14);
 const band=(v,edges,labels)=>{for(let i=0;i<edges.length;i++)if(v<edges[i])return labels[i];return labels[labels.length-1];};
 return{selection:cohortText(p),kpis:{events:r0(sum(e30.map(e=>e.n*wOf(e)))),vehicles:r0(sum(uniq(e30.map(e=>e.v)).map(i=>FLEET[i].w))),share:pct(sum(uniq(e30.map(e=>e.v)).map(i=>FLEET[i].w)),W),active:r0(sum(uniq(act.map(e=>e.v)).map(i=>FLEET[i].w))),critical:r0(sum(uniq(act.filter(e=>DTC[e.code].crit===1).map(e=>e.v)).map(i=>FLEET[i].w))),codes:byCode.size,spreading:codes.filter(c=>c.ratio>=1.8&&c.v30>0).length},
  weekly:{x,crit:[1,2,3,4].map(c=>[CRIT[c],weekly(e182.filter(e=>DTC[e.code].crit===c).map(e=>e.day),e182.filter(e=>DTC[e.code].crit===c).map(wOf),wk)])},codes,
  heat:{x:ms.map(m=>m.name),y:tc,d:tc.map(code=>ms.map(m=>{const n=pop.filter(v=>v.model===m.id).length;if(n<20)return null;return r1(uniq(byCode.get(code).filter(e=>e.day<90&&FLEET[e.v].model===m.id).map(e=>e.v)).length/n*1000);}))},
  bySys:top(countBy(e30,e=>DTC[e.code].sys,wOf),12).map(([k,n])=>[k,r0(n)]),
  bySw:top(countBy(e30,e=>FLEET[e.v].sw,wOf),10).map(([k,n])=>{const d=WSUM(pop.filter(v=>v.sw===k))||1;return[k,r1(n/d*1000)];}).sort((a,b)=>b[1]-a[1]),
  ctx:{phase:top(countBy(e30,e=>e.phase),5),soc:['Below 20%','20 to 50%','50 to 80%','Above 80%'].map(l=>[l,e30.filter(e=>band(e.soc,[20,50,80],['Below 20%','20 to 50%','50 to 80%','Above 80%'])===l).length]),temp:['Below 15 °C','15 to 25 °C','25 to 35 °C','Above 35 °C'].map(l=>[l,e30.filter(e=>band(e.temp,[15,25,35],['Below 15 °C','15 to 25 °C','25 to 35 °C','Above 35 °C'])===l).length])},
  sequences,tile:stateTile(pop,vs=>{const s=new Set(vs.map(v=>v.i));return r1(uniq(e30.filter(e=>s.has(e.v)).map(e=>e.v)).length/vs.length*1000);}),
  records:ev.slice(0,150).map(e=>{const v=FLEET[e.v];return[dstr(e.day),v.vin,MODEL[v.model].name,e.code,DTC[e.code].def,CRIT[DTC[e.code].crit],e.st,e.n,e.phase,e.soc,e.temp,e.odo];})};};

Q.ev_q_dtc_code=p=>{const D=DTC[p.code];if(!D)return{error:'Unknown fault code.'};const ev=dtcOf({...p,comp:null}),pop=svcPop(p),vs=uniq(ev.map(e=>e.v)).map(i=>FLEET[i]),I=ISSUES.find(i=>i.seq.includes(p.code));
 const wk=26,x=Array.from({length:wk},(_,i)=>dnice((wk-1-i)*7).replace(/ \d{4}$/,''));
 const claimAfter=vs.filter(v=>v.claims.some(c=>{const f=Math.max(...v.dtcs.filter(e=>e.code===p.code).map(e=>e.day));return c.failDay<f;}));
 const gaps=[];for(const v of claimAfter){const f=Math.max(...v.dtcs.filter(e=>e.code===p.code).map(e=>e.day)),c=v.claims.filter(c=>c.failDay<f).sort((a,b)=>b.failDay-a.failDay)[0];gaps.push(f-c.failDay);}
 const comps=top(countBy(claimAfter.flatMap(v=>{const f=Math.max(...v.dtcs.filter(e=>e.code===p.code).map(e=>e.day));return v.claims.filter(c=>c.failDay<f).slice(0,1);}),c=>COMP[c.comp].name),5);
 const hit=new Set(vs.map(v=>v.i)),mp=pop.filter(v=>vs.some(u=>u.model===v.model));
 return{code:D.code,def:D.def,sys:D.sys,part:D.part,mode:D.mode,crit:CRIT[D.crit],safety:D.safety,does:D.does,notices:D.notices,causes:D.causes,fix:D.fix,parts:D.parts,check:D.check,issue:I?{id:I.id,name:I.name,step:I.seq.indexOf(p.code)+1,of:I.seq.length}:null,
  kpis:{vehicles:r0(WSUM(vs)),events:r0(sum(ev.map(e=>e.n*FLEET[e.v].w))),claimShare:pct(claimAfter.length,vs.length),medGap:gaps.length?r0(quant(gaps,.5)):null},
  weekly:{x,v:weekly(ev.filter(e=>e.day<182).map(e=>e.day),ev.filter(e=>e.day<182).map(e=>FLEET[e.v].w),wk)},byModel:top(countBy(vs,v=>MODEL[v.model].name,v=>v.w),8).map(([k,n])=>[k,r0(n)]),comps,
  factors:factorLift(mp,hit,D.comp).slice(0,6),vehicles:vs.slice(0,40).map(v=>[v.vin,MODEL[v.model].name,v.city,v.sw,v.dtcs.filter(e=>e.code===p.code).length,dstr(Math.min(...v.dtcs.filter(e=>e.code===p.code).map(e=>e.day))),v.claims.length?'Yes':'No'])};};

Q.ev_q_drift=p=>{const pop=svcPop(p),ms=MODELS.filter(m=>pop.filter(v=>v.model===m.id).length>=25),W=WSUM(pop)||1;
 const rows=HKPIS.map((K,i)=>{if(p.comp&&K.comp!==p.comp)return null;const dv=pop.filter(v=>v.hz[i]>=2.5&&!COMP[K.comp].exclude.includes(v.seg));if(!dv.length)return null;const noClaim=dv.filter(v=>!v.claims.some(c=>c.trueComp===K.comp||c.comp===K.comp)),bm=top(countBy(dv,v=>v.model),1)[0];
   return{key:K.key,name:K.name,comp:COMP[K.comp].name,unit:K.unit,dir:K.dir==='lo'?'Low is bad':'High is bad',n:r0(WSUM(dv)),share:r2(WSUM(dv)/W*100),noClaim:pct(noClaim.length,dv.length),model:MODEL[bm[0]].name,modelShare:pct(bm[1],dv.length),i};}).filter(Boolean).sort((a,b)=>b.n-a.n);
 const topK=rows.slice(0,14),sel=KPI_IDX[p.kpi]||(topK[0]&&KPI_IDX[topK[0].key]);let detail=null;
 if(sel){const i=HKPIS.indexOf(sel),vals=pop.filter(v=>!COMP[sel.comp].exclude.includes(v.seg)).map(v=>[v,kv(v,sel)]),all=vals.map(x=>x[1]),lo=quant(all,.005),hi=quant(all,.995),n=24,wd=(hi-lo)/n||1,bins=Array.from({length:n},(_,b)=>+(lo+wd*(b+.5)).toFixed(sel.dp));
  const hist=(a)=>{const c=Array(n).fill(0);a.forEach(x=>c[clamp(Math.floor((x-lo)/wd),0,n-1)]++);return c.map(x=>r1(x/(a.length||1)*100));};
  const dvs=vals.filter(x=>x[0].hz[i]>=2.5).sort((a,b)=>b[0].hz[i]-a[0].hz[i]),hit=new Set(dvs.map(x=>x[0].i)),mp=pop.filter(v=>dvs.some(d=>d[0].model===v.model));
  detail={key:sel.key,name:sel.name,unit:sel.unit,desc:sel.desc,bins,all:hist(all),drift:hist(dvs.map(x=>x[1])),median:+quant(all,.5).toFixed(sel.dp),
   rule:(isolate(mp,hit,sel.comp)||{text:'No shared factor found'}).text,
   vehicles:dvs.slice(0,40).map(([v,x])=>{const pr=predOf(v,sel.comp);return[v.vin,MODEL[v.model].name,v.city,x,r1(v.hz[i]),v.dtcs.filter(e=>DTC[e.code].comp===sel.comp&&e.day<90).length,v.claims.some(c=>c.trueComp===sel.comp||c.comp===sel.comp)?'Yes':'No',pr?r0(pr.p[2]*100)+'%':'Below 2%'];})};}
 return{selection:cohortText(p),rows,kpis:{indicators:HKPIS.length,drifting:rows.filter(r=>r.share>=.25).length,vehicles:r0(WSUM(pop.filter(v=>[...v.hz].some(z=>z>=2.5)))),noClaim:rows.length?r0(mean(rows.slice(0,10).map(r=>r.noClaim))):0},
  heat:{x:ms.map(m=>m.name),y:topK.map(r=>r.name),d:topK.map(r=>ms.map(m=>{const mp=pop.filter(v=>v.model===m.id);return COMP[KPI_IDX[r.key].comp].exclude.includes(m.seg)?null:r1(mp.filter(v=>v.hz[r.i]>=2.5).length/mp.length*100);}))},detail};};

Q.ev_q_launch=p=>{const cand=MODELS.filter(m=>m.pre&&35-m.launch<=20),M=MODEL[p.model]&&MODEL[p.model].pre?MODEL[p.model]:cand.sort((a,b)=>b.launch-a.launch)[0],P=MODEL[M.pre],pop=INSVC.filter(v=>v.model===M.id),ppop=INSVC.filter(v=>v.model===P.id&&v.buildM<P.launch+10),w=SEG[M.seg].fleet/SEG[M.seg].sample;
 const cl=CLAIMS.filter(c=>FLEET[c.v].model===M.id),pcl=CLAIMS.filter(c=>FLEET[c.v].model===P.id),maxM=Math.min(12,35-M.launch),x=Array.from({length:maxM},(_,i)=>i+1);
 const cur=misCurve(pop,cl,maxM,90),pre=misCurve(INSVC.filter(v=>v.model===P.id),pcl,maxM),target=pre.map(v=>v===null?null:r1(v*.85));
 const bm=uniq(pop.map(v=>v.buildM)).sort((a,b)=>a-b),r3=bm.map(m=>{const vs=pop.filter(v=>v.buildM===m),ids=new Set(vs.map(v=>v.i)),old=vs.filter(v=>misOf(v)>=2);return old.length>=10?r1(cl.filter(c=>ids.has(c.v)&&c.mis<=2&&misOf(FLEET[c.v])>=2).length/old.length*1000):null;});
 const ev=DTCE.filter(e=>FLEET[e.v].model===M.id),early=ev.filter(e=>FLEET[e.v].saleDay-e.day<=30),iss=ISSUES.filter(I=>I.models.includes(M.id));
 const comps=top(countBy(cl,c=>COMP[c.comp].name),8),pc=top(countBy(pcl.filter(c=>c.mis<=maxM),c=>COMP[c.comp].name),30),pcN=INSVC.filter(v=>v.model===P.id).length||1;
 return{models:cand.map(m=>[m.id,m.name]),model:M.id,name:M.name,pre:P.name,months:35-M.launch,
  kpis:{built:r0(WSUM(FLEET.filter(v=>v.model===M.id))),inService:r0(WSUM(pop)),claims:r0(cl.length*w),r3:cur[Math.min(2,maxM-1)],pre3:pre[Math.min(2,maxM-1)],early:r1(uniq(early.map(e=>e.v)).length/(pop.length||1)*100),cost:r0(sum(cl.map(c=>c.total))*w),open:iss.length},
  mis:{x,cur,pre,target},build:{x:bm.map(mlabel),v:r3,n:bm.map(m=>r0(pop.filter(v=>v.buildM===m).length*w))},
  comps:comps.map(([k,n])=>[k,r1(n/pop.length*1000),r1(((pc.find(q=>q[0]===k)||[0,0])[1])/pcN*1000)]),
  codes:top(countBy(ev,e=>e.code,e=>FLEET[e.v].w),8).map(([c,n])=>[c,DTC[c].def,r0(n)]),
  issues:iss.map(I=>{const s=ISTAT[I.id];return[I.id,I.name,I.status,I.causeType,r0(s.affW),s.claimsW,s.e90,I.fix];}),
  plant:top(countBy(cl,c=>FLEET[c.v].plant+' '+FLEET[c.v].line+', shift '+FLEET[c.v].shift),6).map(([k,n])=>{const d=pop.filter(v=>v.plant+' '+v.line+', shift '+v.shift===k).length||1;return[k,r1(n/d*1000)];}),
  gates:[['Claims per 1,000 at 3 months',cur[Math.min(2,maxM-1)],target[Math.min(2,maxM-1)]],['Vehicles with a fault code in first 30 days, %',r1(uniq(early.map(e=>e.v)).length/(pop.length||1)*100),4],['No-fault-found share of claims, %',pct(cl.filter(c=>c.nff).length,cl.length),8],['Open issues without a confirmed cause',iss.filter(I=>['Emerging','Investigating'].includes(I.status)).length,0]]};};
