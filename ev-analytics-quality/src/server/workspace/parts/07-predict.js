/* ===== Predictive failure. For every vehicle and component: the probability of failure within 30, 60 and 90 days and the expected days to failure.
   The estimate uses only what a real model could observe: age, cohort membership, usage, health-indicator drift and fault codes, plus estimation noise.
   It is a demonstration of the output a trained model would give, not a trained model. ===== */
const HZ=[30,60,90];
const medResid=(t,k,eta)=>(eta*Math.pow(Math.pow(t/eta,k)+Math.LN2,1/k)-t)*MONTH_DAYS;
const condP=(t,h,k,eta)=>1-weibS(t+h/MONTH_DAYS,k,eta)/weibS(t,k,eta);
(function predict(){
 for(const v of INSVC){const mis=misOf(v);let surv=[1,1,1];
  for(const C of COMPS){if(C.exclude.includes(v.seg))continue;
   const eta=C.base[1]/Math.pow(USEMULT[v.usage],.3),replaced=v.fails.filter(f=>f.comp===C.id).sort((a,b)=>a.day-b.day)[0],t=replaced?replaced.day/MONTH_DAYS:mis;
   let p=HZ.map(h=>condP(t,h,C.base[0],eta)),ttf=medResid(t,C.base[0],eta),driver='Wear and age',conf='Low',evid=[];
   for(const a of v.iss){const I=ISSUE[a.id];if(I.comp!==C.id||a.fixed)continue;
    const zh=a.z+.5*hn(v.i,a.id.charCodeAt(4)*31+5),acc=I.accel(v)*Math.exp(.4*zh),ei=I.eta/acc;
    let pi=HZ.map(h=>condP(a.expM,h,I.k,ei)),ti=medResid(a.expM,I.k,ei);conf='Medium';
    evid=['In the affected cohort for '+I.id+': '+I.name.toLowerCase()];
    const pv=clamp(a.p-.1*Math.max(0,zh),0,1);
    if(pv>.1){const xh=Math.max(2,I.sigLead*(1-Math.pow(pv,1/.7)))*Math.exp(.35*hn(v.i+17,a.id.charCodeAt(4)*13+1));
     const ps=HZ.map(h=>normCdf((Math.log(h)-Math.log(xh))/.6));pi=pi.map((x,i)=>Math.max(x,ps[i]));ti=Math.min(ti,xh);conf=a.p>.45?'High':'Medium';
     const top=I.sig.map(s=>[s[0],s[1]*a.p]).sort((x,y)=>Math.abs(y[1])-Math.abs(x[1]))[0];evid.push(KPI_IDX[top[0]].name+' is '+r1(Math.abs(top[1]))+' standard deviations '+(top[1]>0?'above':'below')+' peers');}
    const codes=uniq(v.dtcs.filter(e=>I.seq.includes(e.code)&&e.day<90).map(e=>e.code));if(codes.length)evid.push('Fault code'+(codes.length>1?'s ':' ')+codes.join(', ')+' in the last 90 days');
    if(a.pending)evid.push('Earlier repair did not fix the cause; the fault is expected to return');
    if(pi[2]>p[2]){p=pi;ttf=ti;driver=I.id;}}
   // A few healthy vehicles get a false alarm, as any real model would produce.
   if(driver==='Wear and age'&&h32(v.i,C.id.charCodeAt(0)*7+C.id.length)<.0008){const f=.25+.4*h32(v.i,91);p=[f*.4,f*.75,f];ttf=60+120*h32(v.i,92);conf='Low';evid=['Unusual '+KPIS.filter(k=>k.comp===C.id).map(k=>k.name.toLowerCase())[0]+' pattern, no cohort link'];driver='Anomaly';}
   p=p.map(x=>clamp(x,0,.995));
   if(p[2]>=.015)v.pred.push({comp:C.id,p:p.map(x=>r2(x*100)/100),p90:p[2],ttf:r0(Math.max(1,ttf)),driver,conf,evid});
   if(C.stop)surv=surv.map((s,i)=>s*(1-p[i]));
  }
  v.pred.sort((a,b)=>b.p90-a.p90);v.pAny=surv.map(s=>r2(1-s));
 }
})();
const predOf=(v,comp)=>v.pred.find(p=>p.comp===comp);
const bandOf=p=>p.p[0]>=.5?'Now':p.p[1]>=.5?'Within 30 days':p.p[2]>=.5?'Within 60 days':p.p[2]>=.2?'Within 90 days':'Monitor';
// Simulated back-test: compares what the estimate says with what the generator will actually do. Only possible because the data is generated.
function backtest(issueId){const rows=[];for(const v of INSVC)for(const a of v.iss){if(a.fixed||(issueId&&a.id!==issueId))continue;const p=predOf(v,ISSUE[a.id].comp);rows.push({p:p&&p.driver===a.id?p.p90:0,y:a.x<=90?1:0,x:a.x,ttf:p?p.ttf:null});}
 const th=.5,tp=rows.filter(r=>r.p>=th&&r.y).length,fp=rows.filter(r=>r.p>=th&&!r.y).length,fn=rows.filter(r=>r.p<th&&r.y).length;
 const sorted=[...rows].sort((a,b)=>b.p-a.p),totY=rows.filter(r=>r.y).length||1,gain=[];let cum=0;sorted.forEach((r,i)=>{cum+=r.y;if((i+1)%Math.max(1,Math.floor(sorted.length/20))===0||i===sorted.length-1)gain.push([r1((i+1)/sorted.length*100),r1(cum/totY*100)]);});
 const errs=rows.filter(r=>r.y&&r.ttf!==null).map(r=>Math.abs(r.ttf-Math.max(0,r.x)));
 return{n:rows.length,precision:pct(tp,tp+fp),recall:pct(tp,tp+fn),tp,fp,fn,gain,mae:r0(mean(errs)),positives:totY};}
