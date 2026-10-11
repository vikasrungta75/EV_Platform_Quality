/* ===== The fleet: 12,000 sampled vehicles standing for about 1.15 million connected EVs across six segments.
   Each sampled vehicle carries a weight (v.w) = vehicles it stands for; every count shown on screen is a weighted count. ===== */
const PLANTCODE={Hosur:'H',Pune:'P',Chennai:'C',Dharwad:'D'},YEARCODE={2023:'P',2024:'R',2025:'S',2026:'T'};
const FLEET=[];
function swFor(m,buildM,saleDay){
 // Returns [software version, days ago it was installed]
 if(m.id==='ZS1'){if(buildM>=34)return['3.2.1',saleDay];const base=buildM<12?'3.0.4':buildM<24?'3.1.2':'3.2.0';if(buildM>=28)return rnd()<.3?['3.2.1',Math.min(saleDay,rint(8,40))]:['3.2.0',saleDay];
  if(rnd()<.62)return rnd()<.3?['3.2.1',Math.min(saleDay,rint(8,40))]:['3.2.0',Math.min(saleDay,rint(140,215))];return[base==='3.2.0'?'3.1.2':base,saleDay];}
 if(m.id==='KS4'){if(buildM>=33)return['1.0.5',saleDay];return rnd()<.25?['1.0.5',Math.min(saleDay,rint(10,45))]:['1.0.3',saleDay];}
 const fam={'2W':['2.0.3','2.1.0','2.2.4'],'3W':['4.1.0','4.2.2','4.3.0'],'CAR':['2.3.6','2.4.1','2.5.0'],'LCV':['5.0.2','5.1.1','5.2.0'],'BUS':['7.2.0','7.3.1','7.4.0'],'TRK':['6.0.4','6.1.0','6.2.2']}[m.seg];
 let i=buildM<12?0:buildM<24?1:2;if(i<2&&rnd()<.45)i++;return[fam[i],saleDay];}
(function buildFleet(){
 const stW=STATES.map(s=>[s[0],s[4]]);let serial=100000;
 for(const S of SEGS){const ms=MODELS.filter(m=>m.seg===S.id),w=S.fleet/S.sample;
  for(let n=0;n<S.sample;n++){
   const m=MODEL[wpick(ms.map(x=>[x.id,x.share]))];
   const months=[];for(let b=m.launch;b<=35;b++)months.push([b,Math.min(1.5,.35+(b-m.launch)/(m.id==='KS4'?3:14))]);
   const buildM=wpick(months),buildDay=Math.max(1,(35-buildM)*MONTH_DAYS+rnd()*MONTH_DAYS-20);
   const lag=(S.id==='BUS'||S.id==='TRK'?22:12)+rnd()*46,saleDay=buildDay-lag,inService=saleDay>1;
   const st=wpick(stW),SS=STATE[st],city=pick(SS.cities);
   const usage=wpick(USAGE[S.id]),daily=Math.max(6,(S.daily[0]+gauss()*S.daily[1]*.45)*Math.pow(USEMULT[usage],.85));
   const ageD=inService?saleDay:0,odo=Math.round(ageD*daily*(.85+.3*rnd()));
   const dc=clamp(S.id==='BUS'?.72+gauss()*.1:S.id==='2W'?.04+rnd()*.08:['Personal'].includes(usage)?.14+gauss()*.09:.44+gauss()*.2,0,.95);
   const line=wpick(m.lines),shift=wpick(SHIFTS),lots={},yr=yearOfM(buildM);
   for(const c of COMPS)lots[c.id]=c.sup[rnd()<.55?0:1]+'-'+yymm(buildM);
   const [sw,swDay]=swFor(m,buildM,Math.max(saleDay,0));
   let tcu='1.7.9',tcuDay=Math.max(saleDay,0);if(['KC3','KX5','LV1'].includes(m.id)&&buildM<=31){const u=rnd();if(u<.36){tcu='1.8.2';tcuDay=Math.min(tcuDay,rint(120,230));}else if(u<.44){tcu='1.8.4';tcuDay=Math.min(tcuDay,rint(10,60));}}else if(buildM>31)tcu='1.8.4';
   const i=FLEET.length;serial+=rint(1,9);
   FLEET.push({i,vin:'MR9'+(m.id+'XX').slice(0,4)+'E'+YEARCODE[yr]+PLANTCODE[m.plant]+String(serial).padStart(7,'0'),seg:S.id,model:m.id,w,buildM,buildDay,buildY:String(yr),saleDay,inService,
    stock:inService?'With customer':buildDay<9?'Plant yard':buildDay<22?'In transit':'Dealer stock',st,state:SS.name,city,zone:SS.zone,amb:SS.amb+gauss()*1.2,usage,daily:r0(daily),odo,dc:r2(dc),payload:r2(rnd()),
    plant:m.plant,line,shift,lots,sw,swDay,tcu,tcuDay,chem:m.chem,dealer:S.id==='BUS'?city+' depot':city+' '+['North','Central','South'][rint(0,2)],
    iss:[],claims:[],dtcs:[],fails:[],pred:[],pAny:[0,0,0]});
  }}
})();
const INSVC=FLEET.filter(v=>v.inService);
const VIN_IDX=new Map(FLEET.map(v=>[v.vin,v]));
const WSUM=a=>{let t=0;for(const v of a)t+=v.w;return t;};
const misOf=v=>v.saleDay/MONTH_DAYS;
const inWarranty=(v,dayAgo,comp)=>{const ageM=(v.saleDay-dayAgo)/MONTH_DAYS,odo=v.odo*(v.saleDay?((v.saleDay-dayAgo)/v.saleDay):0);if(comp==='bat'||comp==='bms')return ageM<=96&&odo<=SEG[v.seg].kmLimit*1.6;return ageM<=36&&odo<=SEG[v.seg].kmLimit;};
const vfind=q=>{q=String(q||'').toUpperCase().trim();if(!q)return null;return VIN_IDX.get(q)||(q.length>=5?FLEET.find(v=>v.vin.includes(q)):null)||null;};

/* Shared cohort filter used by every screen. */
function csel(p,base){p=p||{};let a=base||FLEET;
 if(p.seg)a=a.filter(v=>v.seg===p.seg);if(p.model)a=a.filter(v=>v.model===p.model);if(p.zone)a=a.filter(v=>v.zone===p.zone);if(p.state)a=a.filter(v=>v.st===p.state);
 if(p.plant)a=a.filter(v=>v.plant===p.plant);if(p.line)a=a.filter(v=>v.line===p.line);if(p.shift)a=a.filter(v=>v.shift===p.shift);if(p.usage)a=a.filter(v=>v.usage===p.usage);if(p.sw)a=a.filter(v=>v.sw===p.sw);if(p.tcu)a=a.filter(v=>v.tcu===p.tcu);
 if(p.buildY)a=a.filter(v=>v.buildY===p.buildY);if(p.buildFrom!==undefined&&p.buildFrom!=='')a=a.filter(v=>v.buildM>=+p.buildFrom);if(p.buildTo!==undefined&&p.buildTo!=='')a=a.filter(v=>v.buildM<=+p.buildTo);
 if(p.lot){const [c,l]=String(p.lot).split(':');a=a.filter(v=>v.lots[c]===l);}
 if(p.supplier&&p.comp)a=a.filter(v=>v.lots[p.comp].startsWith(p.supplier+'-'));
 if(p.issue&&ISSUE[p.issue])a=a.filter(v=>v.iss.some(x=>x.id===p.issue));
 return a;}
const cohortText=p=>{const t=[];p=p||{};if(p.seg)t.push(SEG[p.seg].name);if(p.model)t.push(MODEL[p.model].name);if(p.zone)t.push(p.zone);if(p.state)t.push(STATE[p.state].name);if(p.plant)t.push(p.plant+(p.line?' '+p.line:''));if(p.usage)t.push(p.usage);if(p.sw)t.push('software '+p.sw);if(p.buildY)t.push('built '+p.buildY);if(p.issue)t.push('issue '+p.issue);return t.length?t.join(', '):'All vehicles';};

/* KPI model. A vehicle's value for a KPI = typical value + stable vehicle noise + a small model offset + the effect of any issue it carries.
   Nothing is stored: the value is recomputed from hashes, so it is identical on every request. */
const KPIS=[];
SIGKPI.forEach(k=>KPIS.push({key:k[1],cat:k[0],name:k[2],desc:k[3],unit:k[4],lo:k[5],hi:k[6],base:k[7],sd:(k[6]-k[5])*.06,comp:null,dir:null,src:'trip'}));
SIGCATS.push('Component health indicators');
HEALTH.forEach(h=>KPIS.push({key:h[0],cat:14,name:h[1],desc:h[2],unit:h[3],lo:h[4],hi:h[5],base:h[6],sd:(h[5]-h[4])*h[9],comp:h[7],dir:h[8],src:'health'}));
KPIS.forEach((k,j)=>{k.j=j;k.dp=k.sd<.05?3:k.sd<.5?2:k.sd<5?1:0;});
const KPI_IDX=Object.fromEntries(KPIS.map(k=>[k.key,k]));
ISSUES.forEach(I=>{I.sigMap=Object.fromEntries(I.sig);I.h=hstr(I.id);});
const MODEL_H=Object.fromEntries(MODELS.map(m=>[m.id,hstr(m.id)]));
// z = how many standard deviations the vehicle sits from the typical value. trip: undefined for the vehicle aggregate, else trip number 0..n-1 (latest last).
function kz(v,K,trip,nTrips){const j=K.j;let z=.8*hn(v.i,j*7+1)+.7*(h32(MODEL_H[v.model],j)-.5);
 if(K.cat===10&&v.zone===ZONES[0])z+=.6;
 for(const a of v.iss){if(a.p<=0)continue;const I=ISSUE[a.id],p=trip===undefined?a.p:a.p*(.45+.55*trip/Math.max(1,nTrips-1));
  if(K.src==='health'){const s=I.sigMap[K.key];if(s)z+=s*p;}
  else if(I.cats.includes(K.cat)&&h32(I.h,j)<.3)z+=(h32(I.h,j+99)<.5?-1.7:1.7)*p;}
 if(trip!==undefined)z+=.9*hn(v.i*131+trip*17+3,j*3+5);
 return z;}
const kv=(v,K,trip,nTrips)=>{const x=clamp(K.base+kz(v,K,trip,nTrips)*K.sd,K.lo,K.hi);return+x.toFixed(K.dp);};
const kvKey=(v,key)=>kv(v,KPI_IDX[key]);
