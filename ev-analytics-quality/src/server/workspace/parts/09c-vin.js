/* ===== Queries, part 3: the VIN failure report and Vehicle 360.
   The report brings together everything the other modules know about one vehicle: telemetry against healthy peers and a similar population,
   fault-code history and sequence, predictions, warranty and service history, cohort history, bulletins, past cases and look-alike vehicles. ===== */
// Sample technical bulletins and closed cases. Written for the demo; they are not real documents.
const BULLETINS=[
 ['TSB-25-031','Battery coolant pump: current rise and flow shortfall','pump',['KX5'],'2025-11-18','Pumps from one supplier built January to June 2025 can lose flow as the bearing wears. Check pump current at full command and coolant temperature rise under load.','Replace with pump revision C. Bleed the loop and confirm flow with the service routine.'],
 ['TSB-26-007','Cell balancing does not complete on software 3.2.0','bms',['ZS1'],'2026-08-26','A balancing threshold in 3.2.0 stops balancing on one cell group. Cell spread grows and range falls. The pack is not at fault.','Update to 3.2.1 and run a full balance charge. Do not replace the pack or the BMS for this symptom.'],
 ['TSB-24-019','Charge inlet: inspect seal seating before replacing the inlet','port',['TC3','TP3'],'2024-09-02','Water traces on the inlet pins point to seal seating, not to the charger. Inspect the seal and pin condition first.','Reseat or replace the seal; replace the inlet only if pins are pitted.'],
 ['TSB-25-044','Main contactor: precharge time as a wear check','cont',['LV1','LP2'],'2025-12-09','Rising precharge time and slow opening indicate contact wear. Vans used mostly on DC fast charging wear faster.','Measure precharge time with the diagnostic routine; replace the junction box above the limit.'],
 ['TSB-26-012','12 V battery flat after parking: check sleep current first','lv',['KC3','KX5','LV1','LP2'],'2026-09-22','A 12 V battery that goes flat again after replacement is rarely a battery fault. Measure sleep current after 30 minutes locked.','If sleep current is above 60 mA, find the module keeping the network awake before replacing the battery.'],
 ['TSB-25-008','A/C compressor drive: uprated module for hot-zone depots','hvac',['CB12','CB9'],'2025-07-14','Sustained high ambient duty overloads the compressor drive on some buses. Current for a standard cooling demand rises before the drive trips.','Fit the uprated drive module at the next depot visit.'],
 ['TSB-26-003','Motor position sensor connector: seating and lock check','mot',['ZM2'],'2026-05-30','Intermittent position signal with jerks under load is usually an unseated connector, not a motor fault.','Reseat until the lock clicks and apply the secondary lock. Do not replace the motor unless the fault remains.'],
 ['TSB-25-027','On-board charger: read stored temperature peak before replacement','obc',['KC3','KS4'],'2025-10-03','Chargers that stop on AC with a temperature code may be responding to supply voltage swings.','Check the supply at the customer site and the stored temperature peak; replace only if the output test fails.'],
 ['TSB-24-033','Inverter derate on long gradients: software and coolant checks','inv',['HT16'],'2024-12-11','Frequent derates on hill routes can come from the derate strategy or from low coolant flow.','Apply the latest drive software, check coolant flow, then assess the power stage.'],
 ['TSB-26-015','Infotainment restarts: update to 1.0.5','info',['KS4'],'2026-08-04','Restarts while navigating are caused by a memory leak in 1.0.3.','Update to 1.0.5. Do not replace the head unit.'],
 ['TSB-23-021','HV isolation fault after heavy rain: harness grommet check','har',['KC3','KX5','LV1'],'2023-12-05','Isolation warnings after rain are often water tracking along the rear harness grommet.','Inspect and reseal the grommet; dry and re-test isolation.'],
 ['TSB-24-006','Brake pedal feel after software update: relearn booster','brk',['KC3','KX5','KS4'],'2024-03-19','The brake booster position must be relearned after some updates.','Run the booster relearn routine.'],
 ['TSB-25-039','Battery pack over-temperature code: module temperature gap check','bat',['KC3','KX5','KS4'],'2025-11-27','An over-temperature code with one module running hotter than the rest points to that module, not to the cooling loop.','Read module temperatures during a DC charge. A gap above 6 °C needs a module inspection under the battery procedure. Stop DC fast charging until inspected.']];
const PASTCASES=[
 ['PC-2023-04','Water pump seal weep on first-generation vans','pump','Supplier part','Seal material changed without notice; found by matching failures to three supplier lots.','118 days from first claim to cause','Ask for lot-level traceability at the first five failures.'],
 ['PC-2023-11','Scooter range complaints after a BMS update','bms','Software','State-of-charge estimation drifted after an update; packs replaced before the software cause was found.','76 days; 31% of replaced packs had no fault','Check software version before any pack replacement.'],
 ['PC-2024-02','Contactor chatter on cold starts','cont','Design margin','Coil hold voltage marginal at low 12 V; fixed with a software hold-current change.','64 days','Look at 12 V state before blaming the contactor.'],
 ['PC-2024-06','Charge inlet corrosion in coastal fleets','port','Assembly process','Drain path blocked by sealant; coastal states failed first.','92 days','Geography can be the first clue for sealing faults.'],
 ['PC-2024-09','Repeated 12 V battery replacement on ride-hail cars','lv','Software','A gateway kept the network awake after an app session; batteries were not at fault.','141 days; 58% no-fault-found','A repeat repair is evidence that the wrong part was replaced.'],
 ['PC-2025-01','Motor replaced for a connector fault','mot','Assembly process','Connector secondary lock not applied on one shift after a tooling change.','53 days','Compare shifts whenever returned parts test fault-free.'],
 ['PC-2025-05','Bus compressor trips in summer','hvac','Design margin','Drive electronics derated above 45 °C ambient; hot-zone depots failed first.','88 days','Split by climate zone before splitting by build date.'],
 ['PC-2025-08','Module temperature gap on fast-charged cars','bat','Supplier part','Weld resistance drift at the cell supplier; the first sign was a module running hotter on DC charge.','39 days from first signal to containment','A temperature gap inside the pack is a safety signal, not a comfort signal.']];
const isGood=u=>!u.claims.length&&!u.iss.some(a=>!a.fixed)&&!u.pred.some(x=>x.driver!=='Wear and age');
const stride=(a,n)=>{if(a.length<=n)return a;const s=a.length/n,o=[];for(let i=0;i<n;i++)o.push(a[Math.floor(i*s)]);return o;};
const kpiApplies=(K,v)=>!(K.comp&&COMP[K.comp].exclude.includes(v.seg));
// Precursor strength of an issue on a vehicle at a point in the past.
function pAt(v,a,d){const I=ISSUE[a.id];let x;if(a.fixed){const cs=v.claims.filter(c=>c.issue===a.id).map(c=>c.failDay),f=v.fails.find(f=>f.issue===a.id),R=cs.length?Math.min(...cs):f?f.day:null;if(R===null||d<R)return 0;x=d-R;}else x=Math.max(0,a.x)+d;
 return clamp(Math.pow(clamp(1-x/I.sigLead,0,1),.7)+(x<I.sigLead?.1*Math.max(0,a.z):0),0,1.25);}
function kzAt(v,K,d){const save=v.iss.map(a=>a.p);v.iss.forEach(a=>a.p=pAt(v,a,d));const z=kz(v,K)+.25*hn(v.i+Math.round(d),K.j+41);v.iss.forEach((a,i)=>a.p=save[i]);return z;}
const popStats=(vs,K,trip)=>{const a=trip?vs.flatMap(u=>[0,1,2,3].map(t=>kv(u,K,16+t,20))):vs.map(u=>kv(u,K));return{m:mean(a),s:sdev(a)||K.sd*.5,a};};
// Pre-failure snapshot of health indicators for a vehicle that later failed with an issue: what it looked like 20 days before the claim.
function snapHz(u,c){const save=u.iss.map(a=>a.p);u.iss.forEach(a=>{a.p=a.id===c.issue?clamp(Math.pow(clamp(1-20/ISSUE[a.id].sigLead,0,1),.7)+.1*Math.max(0,a.z),0,1.25):0;});const z=HKPIS.map(K=>{const q=kz(u,K);return K.dir==='lo'?-q:q;});u.iss.forEach((a,i)=>a.p=save[i]);return z;}
function lookAlikes(v,n){const pool=[];for(const u of INSVC){if(u.model!==v.model||u.i===v.i)continue;pool.push({u,z:u.hz,kind:'now'});for(const c of u.claims)if(c.issue&&!c.repeatOf)pool.push({u,z:snapHz(u,c),kind:'before',c});}
 const mask=HKPIS.map(K=>kpiApplies(K,v));const d=o=>{let t=0;for(let i=0;i<mask.length;i++)if(mask[i]){const e=v.hz[i]-o.z[i];t+=e*e;}return Math.sqrt(t);};
 return pool.map(o=>({...o,d:d(o)})).sort((a,b)=>a.d-b.d).slice(0,n||12);}
function serviceHistory(v){const out=[];for(let d=v.saleDay-170-h32(v.i,5)*30,k=1;d>0;d-=175+h32(v.i,k)*25,k++)out.push({day:d,type:'Periodic service',note:k===1?'First service. Software checked, no faults recorded.':'Scheduled service. Brake, tyre and coolant checks.',cost:0,dealer:v.dealer,odo:r0(v.odo*(1-d/v.saleDay))});
 for(const c of v.claims)out.push({day:c.day,type:c.repeatOf?'Warranty repair (repeat visit)':'Warranty repair',note:c.symptom+'. '+COMP[c.comp].name+' replaced. '+c.note,cost:c.total,dealer:c.dealer,odo:c.odo,claim:c.id,nff:c.nff});
 return out.sort((a,b)=>a.day-b.day);}
function identity(v,full){const M=MODEL[v.model],S=SEG[v.seg],mis=misOf(v);return{vin:v.vin,model:M.name,kind:M.kind,seg:S.name,pack:M.kwh+' kWh '+v.chem,plant:v.plant,line:v.line,shift:v.shift,built:dnice(v.buildDay),buildM:mlabel(v.buildM),sold:v.inService?dnice(v.saleDay):'Not yet sold',where:v.stock,
  months:r1(mis),odo:v.odo,daily:v.daily,usage:v.usage,dc:r0(v.dc*100),city:v.city,state:v.state,zone:v.zone,dealer:v.dealer,sw:v.sw,swDate:dnice(v.swDay),tcu:v.tcu,
  warranty:v.inService?(inWarranty(v,0,'mot')?`In warranty: ${r0(Math.max(0,36-mis))} months or ${num(Math.max(0,S.kmLimit-v.odo))} km left`:'Vehicle warranty ended; battery warranty continues'):'Warranty starts at sale',
  lots:full?COMPS.filter(c=>!c.exclude.includes(v.seg)).map(c=>[c.name,SUPPLIERS[v.lots[c.id].split('-')[0]],v.lots[c.id]]):undefined};}

// A stored code from before a successful repair is history, not evidence of a present fault.
const codeCurrent=(v,e)=>!v.claims.some(c=>!c.nff&&c.failDay<=e.day+1&&(c.comp===DTC[e.code].comp||c.trueComp===DTC[e.code].comp||(c.issue&&ISSUE[c.issue].seq.includes(e.code))));
function vinAnalysis(v){const M=MODEL[v.model],model=INSVC.filter(u=>u.model===v.model&&u.i!==v.i),goodAll=model.filter(isGood);
 let sim=model.filter(u=>u.zone===v.zone&&u.usage===v.usage&&Math.abs(u.buildM-v.buildM)<=6);let simText=`${M.name}, ${v.zone}, ${v.usage.toLowerCase()}, built within six months`;
 if(sim.length<40){sim=model.filter(u=>u.zone===v.zone||u.usage===v.usage);simText=`${M.name}, same climate zone or usage`;}if(sim.length<40){sim=model;simText='All '+M.name;}
 const good=stride(goodAll,400),simS=stride(sim,400),rows=[];
 for(const K of KPIS){if(!kpiApplies(K,v))continue;const g=popStats(good,K),s=popStats(simS,K),x=kv(v,K),zg=(x-g.m)/g.s,zs=(x-s.m)/s.s,bad=K.dir?(K.dir==='lo'?-zg:zg):Math.abs(zg);
  rows.push({key:K.key,name:K.name,cat:K.cat,catName:SIGCATS[K.cat],unit:K.unit,comp:K.comp,dir:K.dir,x,good:+g.m.toFixed(K.dp),sim:+s.m.toFixed(K.dp),zg:r1(zg),zs:r1(zs),bad:r1(bad),dp:K.dp});}
 const dev=rows.filter(r=>Math.abs(r.zg)>=2).sort((a,b)=>Math.abs(b.zg)-Math.abs(a.zg));
 // Evidence per component, from five independent sources.
 const cand=COMPS.filter(c=>!c.exclude.includes(v.seg)).map(C=>{const hk=rows.filter(r=>r.comp===C.id),worst=hk.sort((a,b)=>b.bad-a.bad)[0],codes=v.dtcs.filter(e=>DTC[e.code].comp===C.id&&e.day<150&&codeCurrent(v,e)),I=ISSUES.find(i=>i.comp===C.id&&i.pred(v)),a=I&&v.iss.find(x=>x.id===I.id),pr=predOf(v,C.id),cl=v.claims.filter(c=>c.comp===C.id||c.trueComp===C.id);
   const s1=worst?clamp((worst.bad-1.5)/3,0,1):0,s2=clamp(sum(codes.map(e=>DTC[e.code].crit<=2?.5:.3)),0,1),s3=I&&a&&!a.fixed?.6:0,s4=cl.some(c=>c.nff)&&a&&!a.fixed?.7:0,s5=pr&&pr.driver!=='Wear and age'?pr.p[2]:0;
   const score=1-(1-.6*s1)*(1-.5*s2)*(1-.35*s3)*(1-.3*s4)*(1-.6*s5);
   return{comp:C.id,name:C.name,score:r0(score*100),signal:worst&&worst.bad>=1.5?`${worst.name} ${worst.bad} SD on the bad side`:'No drift',codes:uniq(codes.map(e=>e.code)).join(', ')||'None',cohort:I&&a?(a.fixed?'Was in '+I.id+' cohort, repaired':'In '+I.id+' cohort'):'No',prior:cl.length?cl.length+' claim'+(cl.length>1?'s':'')+(cl.some(c=>c.nff)?', no-fault-found':''):'None',pred:pr?r0(pr.p[2]*100)+'% in 90 days':'Below 2%',issue:I&&a&&!a.fixed?I.id:null,s:[s1,s2,s3,s4,s5]};}).sort((a,b)=>b.score-a.score);
 return{M,model,goodAll,good,sim,simS,simText,rows,dev,cand};}

Q.ev_q_rc_samples=()=>{const out=[];
 for(const I of ISSUES){const aff=INSVC.filter(v=>v.iss.some(a=>a.id===I.id&&!a.fixed)).sort((a,b)=>{const pa=predOf(a,I.comp),pb=predOf(b,I.comp);return(pb?pb.p90:0)-(pa?pa.p90:0);});
  if(aff[0])out.push({vin:aff[0].vin,label:MODEL[aff[0].model].name+': '+I.name.toLowerCase(),why:'At risk, not yet failed',issue:I.id});}
 const rep=INSVC.filter(v=>v.claims.filter(c=>c.repeatOf).length>=1&&v.iss.some(a=>a.pending)).slice(0,1)[0];if(rep)out.push({vin:rep.vin,label:MODEL[rep.model].name+': repeat repair, cause not fixed',why:'No-fault-found repeat',issue:null});
 const failed=INSVC.find(v=>v.claims.some(c=>c.issue==='Q-101'&&c.day<40));if(failed)out.push({vin:failed.vin,label:MODEL[failed.model].name+': failed and repaired last month',why:'Recent failure',issue:'Q-101'});
 const anom=INSVC.find(v=>v.pred.some(p=>p.driver==='Anomaly'));if(anom)out.push({vin:anom.vin,label:MODEL[anom.model].name+': anomaly with no known cause',why:'Unexplained',issue:null});
 const ok=INSVC.find(v=>isGood(v)&&v.model==='KX5'&&misOf(v)>12);if(ok)out.push({vin:ok.vin,label:MODEL[ok.model].name+': healthy vehicle',why:'Healthy reference',issue:null});
 return{samples:out};};

Q.ev_q_vinreport=p=>{const v=vfind(p.vin);if(!v)return{error:'No vehicle matches that VIN. Enter the full VIN or at least five characters, or pick a sample.'};if(!v.inService)return{error:'This vehicle has not been sold yet ('+v.stock.toLowerCase()+'), so it has no field data. Open it in Vehicle 360 for build details.'};
 const A=vinAnalysis(v),M=A.M,top1=A.cand[0],abnormal=top1.score>=35,C=COMP[top1.comp],I=top1.issue?ISSUE[top1.issue]:null,a=I&&v.iss.find(x=>x.id===I.id),pr=predOf(v,top1.comp);
 // Signature match against every known issue for this model, whether or not the vehicle is in the cohort.
 const sigMatch=ISSUES.filter(i=>i.models.includes(v.model)).map(i=>{const ks=i.sig.map(s=>{const r=A.rows.find(r=>r.key===s[0]);return r&&((s[1]>0&&r.zg>=1.5)||(s[1]<0&&r.zg<=-1.5))?1:0;}),cs=i.seq.map(c=>v.dtcs.some(e=>e.code===c&&e.day<200&&codeCurrent(v,e))?1:0);return{id:i.id,name:i.name,kpis:sum(ks),ofK:ks.length,codes:sum(cs),ofC:cs.length,cohort:i.pred(v),match:r0((sum(ks)/ks.length*(cs.length?.5:1)+(cs.length?sum(cs)/cs.length*.5:0))*100)};}).sort((x,y)=>y.match-x.match);
 const best=sigMatch[0]&&sigMatch[0].match>=40?sigMatch[0]:null,BI=best?ISSUE[best.id]:I;
 // Fault-code history and sequence
 const firsts=new Map();for(const e of v.dtcs)if(!firsts.has(e.code)||firsts.get(e.code)<e.day)firsts.set(e.code,e.day);const chain=[...firsts.entries()].sort((x,y)=>y[1]-x[1]).map(([code,day])=>({code,def:DTC[code].def,crit:CRIT[DTC[code].crit],first:dstr(day),day:r0(day),n:sum(v.dtcs.filter(e=>e.code===code).map(e=>e.n)),active:v.dtcs.some(e=>e.code===code&&e.st==='Active'),inSeq:!!(BI&&BI.seq.includes(code))}));
 const seq=BI&&BI.seq.length?BI.seq.map((code,j)=>({code,def:DTC[code].def,seen:firsts.has(code),when:firsts.has(code)?dstr(firsts.get(code)):null,crit:CRIT[DTC[code].crit]})):[];
 const nextIdx=seq.findIndex(s=>!s.seen),nextCode=BI&&a&&!a.fixed&&nextIdx>=0?{code:seq[nextIdx].code,def:seq[nextIdx].def,crit:seq[nextIdx].crit,days:r0(Math.max(3,(pr?pr.ttf:BI.lead)*(1-(nextIdx+1)/(seq.length+1))*.8)),does:DTC[seq[nextIdx].code].does}:null;
 const cur=chain.filter(c=>v.dtcs.some(e=>e.code===c.code&&codeCurrent(v,e))),mainCode=cur.find(c=>c.inSeq&&c.active)||cur.find(c=>DTC[c.code].comp===top1.comp)||cur.find(c=>c.inSeq)||null,MD=abnormal&&mainCode?DTC[mainCode.code]:null,critNow=!!(MD&&MD.crit===1&&mainCode.active);
 // Weekly history of the three strongest health indicators
 const tk=A.rows.filter(r=>r.comp&&r.bad>=1.5).sort((x,y)=>y.bad-x.bad).slice(0,3),weeks=Array.from({length:26},(_,i)=>(25-i)*7);
 const trend=tk.map(r=>{const K=KPI_IDX[r.key];return{name:r.name,unit:r.unit,good:r.good,v:weeks.map(d=>d>v.saleDay?null:+clamp(K.base+kzAt(v,K,d)*K.sd,K.lo,K.hi).toFixed(K.dp))};});
 const trips=tk.slice(0,2).map(r=>{const K=KPI_IDX[r.key],g=A.good.slice(0,120).flatMap(u=>[17,18,19].map(t=>kv(u,K,t,20)));return{name:r.name,unit:r.unit,v:Array.from({length:20},(_,t)=>kv(v,K,t,20)),lo:+quant(g,.1).toFixed(K.dp),hi:+quant(g,.9).toFixed(K.dp)};});
 // Cohort history: the same model, component, lot, plant window and geography
 const cm=A.model.concat([v]),ccl=CLAIMS.filter(c=>FLEET[c.v].model===v.model&&(c.comp===top1.comp||c.trueComp===top1.comp)),hit=new Set(ccl.map(c=>c.v)),rate=vs=>vs.length?pct(vs.filter(u=>hit.has(u.i)).length,vs.length):0;
 const lotV=cm.filter(u=>u.lots[top1.comp]===v.lots[top1.comp]),supV=cm.filter(u=>u.lots[top1.comp].split('-')[0]===v.lots[top1.comp].split('-')[0]&&Math.abs(u.buildM-v.buildM)<=3),plV=cm.filter(u=>u.line===v.line&&u.shift===v.shift&&Math.abs(u.buildM-v.buildM)<=2),stV=cm.filter(u=>u.st===v.st),swV=cm.filter(u=>u.sw===v.sw),tcV=cm.filter(u=>u.tcu===v.tcu);
 const cohort=[['All '+M.name,cm.length,rate(cm)],['Same supplier lot ('+v.lots[top1.comp]+')',lotV.length,rate(lotV)],['Same supplier, built within three months',supV.length,rate(supV)],['Same line and shift, built within two months',plV.length,rate(plV)],['Same state ('+v.state+')',stV.length,rate(stV)],['Same software ('+v.sw+')',swV.length,rate(swV)],['Same telematics firmware ('+v.tcu+')',tcV.length,rate(tcV)]].map(r=>[r[0],r0(r[1]*v.w),r[2],r[2]>=Math.max(3,rate(cm)*2)?'Elevated':'Normal']);
 const la=lookAlikes(v,12),before=la.filter(o=>o.kind==='before'),laComp=before.length?top(countBy(before,o=>COMP[o.c.trueComp].name),1)[0]:null;
 const conf=top1.score>=75?'High':top1.score>=50?'Medium':'Low',inCohort=!!(I&&a&&!a.fixed);
 // Written conclusion, assembled from the evidence above.
 const ev=[];if(top1.s[0]>0)ev.push(top1.signal+' against healthy '+M.name+' vehicles.');if(top1.codes!=='None')ev.push('Fault codes for this component: '+top1.codes+'.');
 if(inCohort)ev.push(`The vehicle is in the affected group for ${I.id}: ${I.cause}`);else if(best)ev.push(`The pattern matches ${best.id} (${best.name.toLowerCase()}): ${best.kpis} of ${best.ofK} indicators and ${best.codes} of ${best.ofC} codes, although the vehicle is ${best.cohort?'in':'outside'} the known cohort.`);
 const SHORT=['','supplier lot','supplier and build period','line, shift and build period','state','software','telematics firmware'],el=cohort.map((r,i)=>r[3]==='Elevated'&&i?SHORT[i]:null).filter(Boolean);if(el.length&&abnormal)ev.push('Vehicles with the same '+el.join('; ')+' fail more often than the model average.');
 if(before.length>=3)ev.push(`${before.length} of the 12 most similar vehicles are records of vehicles 20 days before they failed${laComp?' ('+laComp[0].toLowerCase()+')':''}.`);
 if(v.claims.some(c=>c.nff))ev.push('An earlier repair replaced a part without fixing the complaint.');
 if(pr&&pr.driver!=='Wear and age')ev.push(`Failure is ${r0(pr.p[2]*100)}% likely within 90 days; expected in about ${pr.ttf} days.`);
 const lastFix=[...v.claims].sort((x,y)=>x.day-y.day)[0];if(!abnormal&&lastFix)ev.push(`Last repair: ${COMP[lastFix.comp].name.toLowerCase()} replaced on ${dnice(lastFix.day)}. Its indicators have been in the normal range since.`);
 const nffClaim=v.claims.find(c=>c.nff&&c.issue),actions=[];
 if(abnormal){if(C.safety>=3||critNow)actions.push('Contact the customer now. '+(critNow?'Advise them not to drive or charge until inspected.':'Book an inspection within 7 days.'));
  else if(pr&&pr.p[0]>=.5)actions.push('Book the vehicle in within two weeks, before it fails on the road.');else actions.push('Book an inspection at the next convenient visit, within 30 days.');
  actions.push(BI?'Repair: '+BI.fix:'Repair: follow the diagnostic tree for '+C.name.toLowerCase()+'. '+(MD?MD.fix:''));
  if(nffClaim)actions.push(`Do not replace the ${COMP[nffClaim.comp].name.toLowerCase()} again; it was not the cause last time.`);
  if(MD)actions.push('Workshop check: '+MD.check);
  if(BI&&BI.status==='Emerging')actions.push('Add this vehicle as evidence to the emerging issue '+BI.id+' and open a case.');else if(!BI)actions.push('No known issue matches. Send the report to the '+OWNER_OF[top1.comp].toLowerCase()+' and keep the replaced part for teardown.');}
 else actions.push('No action needed. Re-run the report after the next fault code or customer complaint.');
 const verdict=!abnormal?`No abnormal pattern found. ${v.vin} sits within the normal range of healthy ${M.name} vehicles on ${A.rows.length-A.dev.length} of ${A.rows.length} measures.`:
  `Most likely cause: ${C.name.toLowerCase()}${BI?', matching '+BI.id+' ('+BI.name.toLowerCase()+')':''}. ${BI?BI.mode:''}`;
 return{vin:v.vin,generated:dnice(0)+', 06:00 IST data',identity:identity(v,true),
  conclusion:{abnormal,verdict,confidence:abnormal?conf:'High',component:abnormal?C.name:null,comp:top1.comp,issue:BI?{id:BI.id,name:BI.name,status:BI.status,cause:BI.cause,causeType:BI.causeType,fix:BI.fix}:null,evidence:ev,actions,
   customer:abnormal?(critNow?'We have found a fault that could become a safety risk. Please do not drive or charge the vehicle. We will arrange recovery and inspect it before it is used again.':'Our remote check shows a part that is likely to need attention soon. Your vehicle is safe to use. We would like to book a visit so it can be fixed before it causes a breakdown.'):'Your vehicle shows no sign of a fault.',
   parts:abnormal&&MD?MD.parts:abnormal?C.name:'None',owner:OWNER_OF[top1.comp]},
  candidates:A.cand.slice(0,6),sigMatch:sigMatch.slice(0,4),
  health:COMPS.filter(c=>!c.exclude.includes(v.seg)).map(c=>{const hk=A.rows.filter(r=>r.comp===c.id),w=hk.length?Math.max(...hk.map(r=>r.bad)):0;return[c.name,r0(clamp(100-Math.max(0,w-.8)*22,3,100)),hk.length?hk.sort((x,y)=>y.bad-x.bad)[0].name:'No indicator'];}),
  peers:{good:r0(A.goodAll.length*v.w),similar:r0(A.sim.length*v.w),simText:A.simText,total:A.rows.length,deviating:A.dev.length},
  deviations:A.dev.slice(0,40).map(r=>({...r,note:kpiNote(r,v)})),
  bySystem:SIGCATS.map((n,i)=>{const rs=A.rows.filter(r=>r.cat===i);return[n,rs.length,rs.filter(r=>Math.abs(r.zg)>=2).length];}).filter(r=>r[1]),
  trend:{x:weeks.map(d=>dnice(d).replace(/ \d{4}$/,'')),series:trend},trips,
  dtc:{chain,seq,seqIssue:BI?BI.id:null,next:nextCode,main:MD?{code:MD.code,def:MD.def,does:MD.does,notices:MD.notices,causes:MD.causes,fix:MD.fix,check:MD.check,parts:MD.parts,crit:CRIT[MD.crit]}:null,
   events:v.dtcs.slice(0,60).map(e=>[dstr(e.day),e.code,DTC[e.code].def,CRIT[DTC[e.code].crit],e.st,e.n,e.phase,e.soc,e.temp,e.spd,e.odo])},
  predicted:{any:v.pAny.map(x=>r0(x*100)),rows:v.pred.slice(0,8).map(x=>({comp:COMP[x.comp].name,p:x.p.map(q=>r0(q*100)),ttf:x.ttf,driver:x.driver,conf:x.conf,evid:x.evid,band:bandOf(x)}))},
  history:serviceHistory(v).map(s=>({date:dstr(s.day),type:s.type,note:s.note,cost:s.cost,dealer:s.dealer,odo:s.odo,claim:s.claim||'',nff:!!s.nff})),
  cohort:{comp:C.name,rows:cohort,issues:ISSUES.filter(i=>i.models.includes(v.model)).map(i=>[i.id,i.name,i.status,COMP[i.comp].name,i.pred(v)?'Yes':'No'])},
  bulletins:BULLETINS.filter(b=>b[3].includes(v.model)&&(b[2]===top1.comp||A.cand.slice(0,3).some(c=>c.comp===b[2])||v.claims.some(c=>c.comp===b[2]))).map(b=>({id:b[0],title:b[1],comp:COMP[b[2]].name,date:b[4],summary:b[5],action:b[6]})),
  pastCases:PASTCASES.filter(c=>c[2]===top1.comp||(BI&&c[3]===BI.causeType)||v.claims.some(x=>x.comp===c[2])).slice(0,4).map(c=>({id:c[0],title:c[1],comp:COMP[c[2]].name,type:c[3],cause:c[4],time:c[5],lesson:c[6]})),
  lookAlikes:{summary:before.length?`${before.length} of the 12 closest matches are vehicles shortly before a failure${laComp?', most often '+laComp[0].toLowerCase():''}.`:'None of the 12 closest matches went on to fail. This pattern is common among healthy vehicles.',
   rows:la.map(o=>[o.u.vin,o.u.city,mlabel(o.u.buildM),r1(o.d),o.kind==='before'?'Record from 20 days before its claim':'As it is today',o.kind==='before'?COMP[o.c.trueComp].name+' failed '+dstr(o.c.failDay):o.u.pred.some(x=>x.driver!=='Wear and age'&&x.p90>=.5)?'At risk now':o.u.claims.length?'Repaired earlier':'Healthy'])},
  web:{queries:abnormal?[`${C.name} failure electric ${SEG[v.seg].name.toLowerCase()} ${BI?BI.name.toLowerCase():''} causes`,MD?`${MD.code} ${MD.def} electric vehicle causes fix`:`electric vehicle ${C.name.toLowerCase()} recall`,`${C.name.toLowerCase()} recall investigation electric vehicle ${BI?BI.causeType.toLowerCase():''}`]:[`electric ${SEG[v.seg].name.toLowerCase()} common faults`],component:C.name,code:MD?MD.code+' '+MD.def:'',mode:BI?BI.mode:''}};};
function kpiNote(r,v){const up=r.zg>0,parts=[`${r.name} is ${r.x} ${r.unit} against ${r.good} for healthy peers (${Math.abs(r.zg)} standard deviations ${up?'higher':'lower'}).`];
 if(r.comp){parts.push(`Health indicator for the ${COMP[r.comp].name.toLowerCase()}; ${r.dir==='lo'?'low':'high'} values are the bad direction.`);const ks=ISSUES.filter(i=>i.sigMap[r.key]&&i.models.includes(v.model));if(ks.length&&r.bad>=1.5)parts.push('Known precursor of '+ks.map(i=>i.id+' ('+i.name.toLowerCase()+')').join(' and ')+'.');if(r.bad<0)parts.push('It is on the good side, so not a concern.');}
 else{const cs=COMPS.filter(c=>c.cats.includes(r.cat)).map(c=>c.name.toLowerCase());parts.push(`Trip measure in "${SIGCATS[r.cat]}"${cs.length?', which reflects the '+cs.slice(0,2).join(' and '):''}.`);if(Math.abs(r.zs)<1.2)parts.push('It is close to vehicles with the same usage and climate, so usage explains most of it.');}
 return parts.join(' ');}

Q.ev_q_vehicle_search=p=>{const q=String(p.q||'').toUpperCase().trim();if(q.length<3)return{rows:[]};return{rows:FLEET.filter(v=>v.vin.includes(q)).slice(0,+p.limit||12).map(vbrief)};};
Q.ev_q_vehicle=(p,rid)=>{const v=vfind(p.vin);if(!v)return{error:'No vehicle matches that VIN.'};const id=identity(v,rid!=='RCL'),hist=v.inService?serviceHistory(v):[];
 const rc=ISSUES.filter(I=>HANDOVER[I.id]&&HANDOVER[I.id].startsWith('Approved')&&v.iss.some(a=>a.id===I.id&&!a.fixed)).map(I=>{const pr=predOf(v,I.comp);return{id:I.id,name:I.name,band:pr?bandOf(pr):'Monitor',ttf:pr?pr.ttf:null,fix:I.fix};});
 if(rid==='RCL')return{restricted:true,identity:id,recall:rc,history:hist.map(s=>({date:dstr(s.day),type:s.type,dealer:s.dealer,odo:s.odo}))};
 const hk=HKPIS.map((K,i)=>({K,i})).filter(o=>kpiApplies(o.K,v));
 return{identity:id,inService:v.inService,
  kpis:v.inService?{claims:v.claims.length,cost:sum(v.claims.map(c=>c.total)),dtc90:v.dtcs.filter(e=>e.day<90).length,active:uniq(v.dtcs.filter(e=>e.st==='Active').map(e=>e.code)).length,any90:r0(v.pAny[2]*100),issues:v.iss.filter(a=>!a.fixed).length}:null,
  health:COMPS.filter(c=>!c.exclude.includes(v.seg)).map(c=>{const z=hk.filter(o=>o.K.comp===c.id).map(o=>v.hz?v.hz[o.i]:0),w=z.length?Math.max(...z):0;return[c.name,r0(clamp(100-Math.max(0,w-.8)*22,3,100))];}),
  indicators:v.inService?hk.map(o=>[o.K.name,COMP[o.K.comp].name,kv(v,o.K),o.K.unit,o.K.base,r1(v.hz[o.i])]).sort((a,b)=>b[5]-a[5]):[],
  predicted:v.pred.slice(0,8).map(x=>({comp:COMP[x.comp].name,p:x.p.map(q=>r0(q*100)),ttf:x.ttf,driver:x.driver,conf:x.conf,band:bandOf(x)})),
  issues:v.iss.map(a=>[a.id,ISSUE[a.id].name,ISSUE[a.id].status,a.fixed?'Repaired or updated':a.pending?'Repair did not fix the cause':'Open',r0(a.p*100)]),recall:rc,
  history:hist.map(s=>({date:dstr(s.day),type:s.type,note:s.note,cost:s.cost,dealer:s.dealer,odo:s.odo,claim:s.claim||'',nff:!!s.nff})),
  dtcs:v.dtcs.slice(0,80).map(e=>[dstr(e.day),e.code,DTC[e.code].def,CRIT[DTC[e.code].crit],e.st,e.n,e.phase,e.odo]),
  software:[[v.sw,dnice(v.swDay),v.swDay<v.saleDay-5?'Over the air':'Factory'],[v.tcu,dnice(v.tcuDay),v.tcuDay<v.saleDay-5?'Over the air':'Factory']]};};
