/* ===== Queries, part 1: roles, navigation, filters, the command centre, the alert centre and the AI agents ===== */
const ROLES=[
 {id:'QLT',name:'Quality department',person:'Quality team',scope:'Everything in quality: all segments, models, plants, suppliers and vehicles',group:'Quality',ask:['What needs a decision today?','Which issue will cost the most in the next 90 days?','Summarise the 12 V battery drain issue','Which vehicles should we bring in first?'],notSee:[]},
 {id:'RCL',name:'Recall office',person:'Recall office',scope:'Risk-ranked vehicle lists that quality has approved, and vehicle look-up. No warranty cost, supplier or plant data.',group:'Outside quality',ask:['Which lists are approved for customer contact?','How many vehicles are in the first wave?'],notSee:['Warranty cost','Supplier names and lots','Plant and shift data','Issues not yet approved by quality']}];
const ROLE=Object.fromEntries(ROLES.map(r=>[r.id,r]));
const NAV=[['Command',[['home','Quality command centre'],['alerts','Alert centre'],['agents','AI agents']]],['Detect',[['early','Early warning']]],['Investigate',[['rootcause','AI root cause'],['vehicle','Vehicle 360']]],['Predict and act',[['predict','Predictive failure'],['recall','Recall risk list']]],['Cost and source',[['warranty','Warranty intelligence'],['supplier','Supplier and plant quality']]],['Reference',[['blueprint','Objectives and benefits'],['kpis','KPI library'],['research','Research basis'],['users','Users and access']]]];
const RCL_PAGES=['recall','vehicle','blueprint'];
function navFor(rid){return NAV.map(([group,pages])=>({group,pages:pages.filter(p=>rid==='QLT'||RCL_PAGES.includes(p[0])).map(p=>({id:p[0],label:p[1]}))})).filter(g=>g.pages.length);}
function roleList(){return ROLES.map(r=>({id:r.id,name:r.name,person:r.person,scope:r.scope,group:r.group,ask:r.ask,notSee:r.notSee}));}
const HANDOVER={'Q-103':'Approved, with recall office','Q-104':'Approved, with recall office','Q-111':'Awaiting approval by head of quality'};

const wcl=cl=>{let t=0;for(const c of cl)t+=FLEET[c.v].w;return t;};
const costW=cl=>{let t=0;for(const c of cl)t+=c.total*FLEET[c.v].w;return t;};
const hasCohort=p=>!!(p&&(p.seg||p.model||p.zone||p.state||p.plant||p.line||p.shift||p.usage||p.sw||p.tcu||p.buildY||p.issue||p.lot||(p.buildFrom!==undefined&&p.buildFrom!=='')||(p.buildTo!==undefined&&p.buildTo!=='')));
function claimsOf(p,compField){let cl=CLAIMS;if(hasCohort(p)){const vs=new Set(csel(p).map(v=>v.i));cl=cl.filter(c=>vs.has(c.v));}if(p&&p.comp)cl=cl.filter(c=>c[compField||'comp']===p.comp);return cl;}
function dtcOf(p){let ev=DTCE;if(hasCohort(p)){const vs=new Set(csel(p).map(v=>v.i));ev=ev.filter(e=>vs.has(e.v));}if(p&&p.comp)ev=ev.filter(e=>DTC[e.code].comp===p.comp);if(p&&p.code)ev=ev.filter(e=>e.code===p.code);if(p&&p.crit)ev=ev.filter(e=>DTC[e.code].crit===+p.crit);return ev;}
const svcPop=p=>csel(p,INSVC);
// Cumulative claims per 1,000 vehicles by months in service, counting only vehicles old enough to have reached each month.
function misCurve(pop,cl,maxM,minN){const out=[];for(let m=1;m<=maxM;m++){const at=pop.filter(v=>misOf(v)>=m);if(at.length<(minN||15)){out.push(null);continue;}const ids=new Set(at.map(v=>v.i));out.push(r1(cl.filter(c=>c.mis<=m&&ids.has(c.v)).length/at.length*1000));}return out;}
const stateTile=(pop,val)=>{const m=groupBy(pop,v=>v.st),o={};for(const [k,vs] of m)o[k]=vs.length>=8?val(vs):null;return o;};
const vbrief=v=>({vin:v.vin,model:MODEL[v.model].name,seg:SEG[v.seg].name,city:v.city,state:v.state,zone:v.zone,usage:v.usage,built:mlabel(v.buildM),sw:v.sw,odo:v.odo});
const page=(rows,p,size)=>{size=size||50;const pg=Math.max(1,+(p&&p.page)||1);return{rows:rows.slice((pg-1)*size,pg*size),total:rows.length,page:pg,size};};

const Q={};
Q.ev_q_filters=()=>({segs:SEGS.map(s=>[s.id,s.name]),models:MODELS.map(m=>[m.id,m.name,m.seg]),zones:ZONES,states:STATES.map(s=>[s[0],s[1]]),plants:Object.keys(PLANTS),lines:PLANTS,usage:uniq(Object.values(USAGE).flat().map(u=>u[0])),buildY:['2023','2024','2025','2026'],
 comps:COMPS.map(c=>[c.id,c.name]),suppliers:Object.entries(SUPPLIERS),issues:ISSUES.map(I=>[I.id,I.id+' '+I.name]),sources:uniq(ALERTS.map(a=>a.source)),owners:SPECIALISTS,months:Array.from({length:36},(_,m)=>[m,mlabel(m)])});

Q.ev_q_home=p=>{const pop=svcPop(p),cl=claimsOf(p),ids=hasCohort(p)?new Set(pop.map(v=>v.i)):null,W=WSUM(pop)||1;
 const c12=cl.filter(c=>c.day<365),cPrev=cl.filter(c=>c.day>=365&&c.day<730),cost12=costW(c12),al=ALERTS.filter(a=>(!p.seg||a.seg===p.seg)&&(!p.model||a.model===p.model));
 const exp12=sum(pop.map(v=>v.w*Math.min(v.saleDay,365)/365))||1,expPrev=sum(pop.map(v=>v.w*clamp((v.saleDay-365)/365,0,1)))||1;
 const months=Array.from({length:24},(_,i)=>i+12),mcost=months.map(m=>0),mcl=months.map(m=>0),segCost={};SEGS.forEach(s=>segCost[s.id]=months.map(()=>0));
 for(const c of cl){const m=monthOfDay(c.day)-12;if(m<0)continue;const v=FLEET[c.v];mcost[m]+=c.total*v.w;mcl[m]+=v.w;segCost[v.seg][m]+=c.total*v.w;}
 const fleetAt=months.map(m=>{const d=(35-m)*MONTH_DAYS;let t=0;for(const v of pop)if(v.saleDay>d)t+=v.w;return t||1;});
 let risk90=0,risk30=0,costRisk=0;for(const v of pop){const b=v.pred.find(x=>x.driver!=='Wear and age');if(!b)continue;if(b.p[2]>=.5)risk90+=v.w;if(b.p[0]>=.5)risk30+=v.w;}
 const iss=ISSUES.filter(I=>!p.model||I.models.includes(p.model)).filter(I=>!p.seg||I.models.some(m=>MODEL[m].seg===p.seg)).map(I=>{const s=ISTAT[I.id];costRisk+=s.e90*s.avgCost;return{id:I.id,name:I.name,status:I.status,safety:I.safety,comp:COMP[I.comp].name,models:I.models.map(m=>MODEL[m].name).join(', '),owner:I.owner,causeType:I.causeType,affW:r0(s.affW),openW:r0(s.openW),claimsW:s.claimsW,cost:r0(s.cost),e90:s.e90,n30:s.n30,lead:s.lead,exposure:r0(s.e90*s.avgCost)};}).sort((a,b)=>b.exposure-a.exposure);
 const leads=ISSUES.map(I=>ISTAT[I.id].lead).filter(x=>x),linked=costW(c12.filter(c=>c.issue));
 return{selection:cohortText(p),fleet:r0(WSUM(csel(p))),inService:r0(W),
  kpis:{alertsOpen:al.filter(a=>a.status!=='Linked to case').length,alertsCritical:al.filter(a=>a.severity==='Critical').length,issuesOpen:iss.length,emerging:iss.filter(i=>i.status==='Emerging').length,cost12:r0(cost12),costTrend:cPrev.length?r1((cost12/exp12)/(costW(cPrev)/expPrev)*100-100):null,c1000:r1(wcl(c12)/exp12*1000),cpv:r0(cost12/exp12),risk90:r0(risk90),risk30:r0(risk30),costRisk:r0(costRisk),lead:leads.length?r0(quant(leads,.5)):null,linkedShare:pct(linked,cost12)},
  sevBySource:(()=>{const src=uniq(al.map(a=>a.source));return{src,rows:SEV.map(s=>[s,src.map(x=>al.filter(a=>a.severity===s&&a.source===x).length)])};})(),
  topAlerts:al.slice(0,7),issues:iss,months:months.map(mlabel),mcost:mcost.map(cr),mrate:mcl.map((x,i)=>r2(x/fleetAt[i]*1000)),segCost:SEGS.filter(s=>sum(segCost[s.id])>0).map(s=>[s.name,segCost[s.id].map(cr)]),
  tile:stateTile(pop,vs=>{const s=new Set(vs.map(v=>v.i));return r1(c12.filter(c=>s.has(c.v)).length/vs.length*1000);}),
  segs:SEGS.filter(s=>!p.seg||s.id===p.seg).map(s=>{const sp=pop.filter(v=>v.seg===s.id),sc=c12.filter(c=>FLEET[c.v].seg===s.id),e=sum(sp.map(v=>v.w*Math.min(v.saleDay,365)/365))||1,ti=iss.find(i=>ISSUE[i.id].models.some(m=>MODEL[m].seg===s.id));return[s.name,r0(WSUM(sp)),r1(wcl(sc)/e*1000),r0(costW(sc)/e),cr(costW(sc)),al.filter(a=>a.seg===s.id).length,ti?ti.id+' '+ti.name:'None open'];}).filter(r=>r[1]>0),
  findings:FINDINGS.filter(f=>(!p.seg||f.seg===p.seg)&&(!p.model||f.models.includes(p.model))).slice(0,4).map(f=>({id:f.id,title:f.title,severity:f.severity,line:f.summary[1]||f.summary[0],actions:f.actions.length,issue:f.issue,agent:AGENTS.find(a=>a.id===f.agent).name})),
  funnel:[['Signals checked last night',r0(W*HKPIS.length/1000)*1000],['Deviations found',r0(sum(pop.map(v=>v.w*[...v.hz].filter(z=>z>=2.5).length)))],['Alerts raised',al.length],['Clusters with a shared cause',FINDINGS.filter(f=>f.rule).length],['Actions awaiting approval',sum(FINDINGS.map(f=>f.actions.length))]]};};

const ALERT_FIELDS=['source','severity','status','segName','modelName','compName','system','plant','supplier','owner','safety','issue'];
Q.ev_q_alerts=p=>{let a=ALERTS;for(const f of ALERT_FIELDS)if(p[f])a=a.filter(x=>String(x[f]||'')===p[f]);if(p.days)a=a.filter(x=>x.day<=+p.days);
 if(p.q){const q=String(p.q).toLowerCase();a=a.filter(x=>(x.id+' '+x.title+' '+x.metric+' '+x.where+' '+(x.code||'')+' '+(x.issue||'')+' '+x.issueName).toLowerCase().includes(q));}
 const facets={};for(const f of ALERT_FIELDS)facets[f]=top(countBy(ALERTS.filter(x=>x[f]),x=>String(x[f])),40);
 const days=Array.from({length:28},(_,i)=>27-i);
 return{total:ALERTS.length,shown:a.length,rows:a,facets,bySeverity:SEV.map(s=>[s,a.filter(x=>x.severity===s).length]),bySource:top(countBy(a,x=>x.source),12),byOwner:top(countBy(a,x=>x.owner),12),byStatus:top(countBy(a,x=>x.status),6),
  trend:{x:days.map(d=>dnice(d).replace(/ \d{4}$/,'')),sev:SEV.map(s=>[s,days.map(d=>a.filter(x=>x.severity===s&&x.day===d).length)])},vehicles:r0(sum(uniq(a.map(x=>x.model+x.comp)).map(k=>Math.max(...a.filter(x=>x.model+x.comp===k).map(x=>x.vehicles)))))};};

Q.ev_q_agents=p=>({agents:AGENTS.map(a=>{const f=FINDINGS.filter(x=>x.agent===a.id);return{...a,findings:f.length,actions:sum(f.map(x=>x.actions.length)),last:a.runs.startsWith('On every')?'12 minutes ago':dnice(0)+', '+(a.runs.match(/\d\d:\d\d/)||['03:00'])[0]+' IST'};}),
 findings:FINDINGS.filter(f=>!p.agent||f.agent===p.agent).map(f=>({...f,agentName:AGENTS.find(a=>a.id===f.agent).name,rule:f.rule?{text:f.rule.text,n:f.rule.n,w:r0(f.rule.w),k:f.rule.k,rate:f.rule.rate,cover:f.rule.cover}:null})),
 totals:{findings:FINDINGS.length,newPatterns:FINDINGS.filter(f=>!f.known).length,actions:sum(FINDINGS.map(f=>f.actions.length)),cost:r0(sum(FINDINGS.filter(f=>f.agent!=='recov').map(f=>f.cost))),byType:top(countBy(FINDINGS.flatMap(f=>f.actions),a=>a.type),12)}});
