/* ===== Events: failures, warranty claims and fault-code events, generated from the component life models and the planted issues. ===== */
const DTC=Object.fromEntries(DTCS.map(d=>[d[0],{code:d[0],def:d[1],comp:d[2],sys:d[3],part:d[4],mode:d[5],crit:d[6],safety:d[7],does:d[8],notices:d[9],causes:d[10],fix:d[11],parts:d[12],check:d[13]}]));
const CRIT=['','Critical','High','Medium','Low'];
const CLAIMS=[],DTCE=[],DTC_WINDOW=400;
const SYMPTOM={bat:['Reduced range and power warning','Battery warning lamp, charging refused','Vehicle stopped with battery over-temperature message'],bms:['Range drops suddenly at low charge','Battery warning, power cut at low charge','State of charge jumps'],mot:['Jerking under acceleration','Loss of drive with EV system warning','Whine from drive unit'],inv:['Reduced power on climbs','EV system warning, vehicle will not go READY','Repeated power limit message'],
 obc:['AC charging stops after a few minutes','Vehicle will not charge at home','Charger fault message'],dcdc:['12 V warning lamp while driving','Multiple warning lamps, low system voltage'],port:['Charging stops, connector hot to touch','Connector will not lock','Charging interrupted repeatedly'],pump:['Reduced power in hot weather','Battery temperature warning','Coolant pump noisy'],cont:['Vehicle will not go READY','EV system warning after switch-off','Charging will not start'],
 lv:['Vehicle will not start after parking','12 V battery flat','Vehicle dead after a weekend'],tcu:['Connected services offline','12 V battery flat after parking','App shows vehicle unreachable'],brk:['Brake pedal feel changed','Brake warning lamp','Regeneration weak'],sus:['Knocking from rear over bumps','Steering feels loose','Uneven tyre wear'],hvac:['Cabin not cooling','A/C cuts out in traffic','A/C slow to cool'],info:['Screen restarts while driving','Blank screen, no reverse camera','Cluster freezes'],har:['Intermittent EV system warning','Isolation warning in rain']};
const TECHNOTE={ok:['Part replaced, fault cleared, road test passed.','Replaced as per diagnostic tree. Vehicle returned to customer.','Fault confirmed and part replaced.'],nff:['Part replaced as precaution. Could not reproduce the fault in the workshop.','Replaced the part. Customer returned later with the same complaint.','No stored fault at the time of visit; part replaced on symptom.'],repeat:['Repeat visit for the same complaint. Replaced again.','Second repair for this symptom. Escalated to technical support.']};
let claimSeq=260000;
function mkClaim(v,trueComp,I,failDay,repeatOf){
 const claimComp=I&&I.claimAs?wpick(I.claimAs):trueComp,C=COMP[claimComp],S=SEG[v.seg];
 const nff=I?(claimComp!==trueComp||rnd()<I.nff):rnd()<.05;
 const lag=rint(1,12),day=failDay-lag;
 // A repair in the last few days has not reached the warranty system yet: claims lag the failure, which is why claims alone detect late.
 if(day<0)return{nff:false,id:null,unfiled:true};
 const partF=claimComp==='bat'?(rnd()<.7?.32:1):1;
 const parts=r0(C.part*S.cost*partF*(.82+.4*rnd())),labour=r0(C.lab*LABOUR_RATE*Math.pow(S.cost,.5)*(.8+.5*rnd())),other=C.stop?r0((1800+rnd()*2400)*Math.pow(S.cost,.6)):0;
 const supResp=I?(I.causeType==='Supplier part'||I.causeType==='Design margin'):rnd()<.22;
 const recoverable=supResp&&!nff?r0(parts*.75):0;
 const recState=!recoverable?'Not recoverable':I&&(I.status==='Root cause confirmed'||I.status==='Countermeasure in field')?(rnd()<.62?'Recovered':'Claimed, awaiting supplier'):I?'Not yet claimed':rnd()<.5?'Recovered':'Claimed, awaiting supplier';
 const mis=Math.max(0,(v.saleDay-failDay)/MONTH_DAYS);
 const c={id:'WC'+(++claimSeq),v:v.i,comp:claimComp,trueComp,issue:I?I.id:null,failDay,day,mis:r1(mis),odo:r0(v.odo*(v.saleDay?clamp((v.saleDay-failDay)/v.saleDay,0,1):0)),nff,repeatOf:repeatOf||null,parts,labour,other,total:parts+labour+other,
  status:day<25&&rnd()<.5?'Pending':rnd()<.045?'Rejected':'Approved',dealer:v.dealer,recoverable,recState,recovered:recState==='Recovered'?recoverable:0,
  symptom:pick(SYMPTOM[trueComp==='tcu'&&claimComp==='lv'?'lv':claimComp]),note:pick(repeatOf?TECHNOTE.repeat:nff?TECHNOTE.nff:TECHNOTE.ok)};
 CLAIMS.push(c);v.claims.push(c);return c;}
(function simulate(){
 for(const v of INSVC){const mis=misOf(v);
  for(const C of COMPS){if(C.exclude.includes(v.seg))continue;
   let best={t:weibT(C.base[0],C.base[1]/Math.pow(USEMULT[v.usage],.3)),I:null,a:null};
   for(const I of ISSUES){if(I.comp!==C.id||!I.pred(v))continue;
    const z=gauss(),acc=I.accel(v)*Math.exp(.4*z),expDay=I.id==='Q-102'||I.id==='Q-109'?Math.min(v.saleDay,v.swDay):I.id==='Q-106'?Math.min(v.saleDay,v.tcuDay):v.saleDay;
    const T=weibT(I.k,I.eta/acc),expM=expDay/MONTH_DAYS;
    const a={id:I.id,z,acc,T,expM,x:(T-expM)*MONTH_DAYS,fixed:false,p:0,failed:false};v.iss.push(a);
    const tSale=(v.saleDay-expDay)/MONTH_DAYS+T;if(tSale<best.t)best={t:tSale,I,a};}
   if(best.t>mis)continue;
   const failDay=v.saleDay-best.t*MONTH_DAYS,I=best.I,a=best.a;
   v.fails.push({comp:C.id,day:failDay,issue:I?I.id:null});
   // A base failure replaces the part, which also removes any issue carried by that part.
   v.iss.forEach(x=>{if(ISSUE[x.id].comp===C.id&&x!==a&&ISSUE[x.id].causeType!=='Software'){x.fixed=true;}});
   if(a)a.failed=true;
   if(!inWarranty(v,failDay,C.id)){if(a)a.fixed=true;continue;}
   let c=mkClaim(v,C.id,I,failDay,null),d=failDay,guard=0;
   // No-fault-found repairs do not fix the vehicle: the fault returns until the true cause is repaired.
   while(c.nff&&guard++<3){const again=I?rnd()<.68:rnd()<.25;if(!again){if(a)a.fixed=true;break;}
    d=d-rint(18,85);if(d<=0){if(a){a.x=-d+rint(3,25);a.fixed=false;a.pending=true;}break;}
    c=mkClaim(v,C.id,I,d,c.id);if(!c.nff&&a)a.fixed=true;}
   if(a&&!c.nff)a.fixed=true;
  }
  // Precursor strength now: 0 = nothing visible, 1 = at the point of failure.
  for(const a of v.iss){const I=ISSUE[a.id];if(a.fixed){a.p=0;continue;}if(a.failed&&!a.pending){a.p=0;a.fixed=true;continue;}
   const x=Math.max(0,a.x);a.p=r2(clamp(Math.pow(clamp(1-x/I.sigLead,0,1),.7)+.1*Math.max(0,a.z),0,1.25));}
 }
 // Fault-code events inside the last 400 days.
 const bg=DTCS.map(d=>[d[0],d[6]>=3?5:d[6]===2?1.1:.05]);
 const ev=(v,code,day,cnt,fixedAfter)=>{if(day<0||day>DTC_WINDOW||day>v.saleDay)return;const D=DTC[code];if(COMP[D.comp].exclude.includes(v.seg))return;
  const e={v:v.i,code,day:r1(day),n:cnt,odo:r0(v.odo*(1-day/Math.max(1,v.saleDay))),phase:D.sys==='Charging'?'Charging':wpick([['Driving',.62],['Charging',.2],['Parked',.18]]),soc:rint(8,98),temp:r0(v.amb+gauss()*6),spd:0,
   st:fixedAfter!==null&&day>fixedAfter?'Stored':day<16?'Active':'Stored'};e.spd=e.phase==='Driving'?rint(8,96):0;DTCE.push(e);v.dtcs.push(e);};
 for(const v of INSVC){
  const lam=.75*Math.min(v.saleDay,DTC_WINDOW)/365*Math.pow(USEMULT[v.usage],.4);let n=0,L=Math.exp(-lam),p=1;do{n++;p*=rnd();}while(p>L);n--;
  for(let k=0;k<n;k++)ev(v,wpick(bg),rnd()*Math.min(v.saleDay,DTC_WINDOW),rint(1,3),null);
  for(const a of v.iss){const I=ISSUE[a.id];if(!I.seq.length)continue;
   // Every failure of this issue on this vehicle is preceded by the code sequence; pending repeats are still building up.
   const fd=v.claims.filter(c=>c.issue===I.id).map(c=>c.failDay);if(!a.fixed)fd.push(-Math.max(0,a.x));else if(a.failed&&!fd.length){const f=v.fails.find(f=>f.issue===I.id);if(f)fd.push(f.day);}
   const Lv=I.lead*Math.exp(.35*gauss()),m=I.seq.length;
   for(const F of fd){const repaired=F>=0?F:null;
    I.seq.forEach((code,j)=>{const onset=F+Lv*((m-j)/m);let d=onset;let reps=0;while(d>F&&reps<7){if(d>=0)ev(v,code,d,rint(1,j===m-1?3:9),repaired);d-=rint(3,11)*(1+j*.3);reps++;}
     if(j===m-1&&F>=0)ev(v,code,F+rnd()*.8,rint(1,4),repaired);});}
  }
 }
 CLAIMS.sort((a,b)=>a.day-b.day);DTCE.sort((a,b)=>a.day-b.day);
})();
const claimW=c=>FLEET[c.v].w;
const CLAIM_IDX=new Map(CLAIMS.map(c=>[c.id,c]));
