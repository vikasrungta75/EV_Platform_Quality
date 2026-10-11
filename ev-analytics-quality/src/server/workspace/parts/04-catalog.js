/* ===== Reference data: segments, models, geography, plants, components, suppliers, health indicators and the planted quality issues.
   Every name here is invented for the demo. No supplier, model or plant refers to a real company or product. ===== */
const SEGS=[
 {id:'2W',name:'Two-wheeler',fleet:640000,sample:3400,cost:.18,kmLimit:40000,daily:[28,14]},
 {id:'3W',name:'Three-wheeler',fleet:150000,sample:1600,cost:.3,kmLimit:80000,daily:[85,25]},
 {id:'CAR',name:'Passenger car',fleet:280000,sample:3800,cost:1,kmLimit:100000,daily:[42,22]},
 {id:'LCV',name:'Light commercial',fleet:64000,sample:1600,cost:1.15,kmLimit:150000,daily:[110,35]},
 {id:'BUS',name:'Bus',fleet:9600,sample:1000,cost:3.2,kmLimit:400000,daily:[190,40]},
 {id:'TRK',name:'Truck',fleet:4200,sample:600,cost:3.5,kmLimit:400000,daily:[230,60]}];
const SEG=Object.fromEntries(SEGS.map(s=>[s.id,s]));
const MODELS=[
 {id:'ZS1',name:'Zip S1',seg:'2W',kind:'Scooter',kwh:3.2,share:.68,launch:0,plant:'Hosur',lines:[['L1',.7],['L2',.3]],chem:'LFP',pre:null},
 {id:'ZM2',name:'Zip M2',seg:'2W',kind:'Motorcycle',kwh:4.4,share:.32,launch:18,plant:'Hosur',lines:[['L2',1]],chem:'NMC',pre:'ZS1'},
 {id:'TP3',name:'Tuk P3',seg:'3W',kind:'Passenger carrier',kwh:8.6,share:.5,launch:0,plant:'Pune',lines:[['L1',1]],chem:'LFP',pre:null},
 {id:'TC3',name:'Tuk C3',seg:'3W',kind:'Cargo carrier',kwh:10.8,share:.5,launch:6,plant:'Pune',lines:[['L1',.25],['L2',.75]],chem:'LFP',pre:'TP3'},
 {id:'KC3',name:'Kiro C3',seg:'CAR',kind:'Compact hatch',kwh:30,share:.45,launch:0,plant:'Chennai',lines:[['L1',.85],['L3',.15]],chem:'LFP',pre:null},
 {id:'KX5',name:'Kiro X5',seg:'CAR',kind:'SUV',kwh:46,share:.4,launch:4,plant:'Chennai',lines:[['L2',1]],chem:'NMC',pre:'KC3'},
 {id:'KS4',name:'Kiro S4',seg:'CAR',kind:'Sedan',kwh:52,share:.15,launch:29,plant:'Chennai',lines:[['L3',1]],chem:'NMC',pre:'KX5'},
 {id:'LV1',name:'Lodr V1',seg:'LCV',kind:'Panel van',kwh:36,share:.65,launch:2,plant:'Pune',lines:[['L3',1]],chem:'LFP',pre:null},
 {id:'LP2',name:'Lodr P2',seg:'LCV',kind:'Pickup',kwh:32,share:.35,launch:14,plant:'Pune',lines:[['L3',1]],chem:'LFP',pre:'LV1'},
 {id:'CB9',name:'Citi B9',seg:'BUS',kind:'9 m city bus',kwh:186,share:.45,launch:0,plant:'Dharwad',lines:[['L1',1]],chem:'LFP',pre:null},
 {id:'CB12',name:'Citi B12',seg:'BUS',kind:'12 m city bus',kwh:320,share:.55,launch:5,plant:'Dharwad',lines:[['L1',1]],chem:'LFP',pre:'CB9'},
 {id:'HT16',name:'Hefta T16',seg:'TRK',kind:'16 t rigid truck',kwh:240,share:1,launch:6,plant:'Dharwad',lines:[['L2',1]],chem:'LFP',pre:null}];
const MODEL=Object.fromEntries(MODELS.map(m=>[m.id,m]));
const ZONES=['Hot and dry','Coastal humid','Temperate','Cold and hilly'];
// [tile code, state, zone, cities, weight, average ambient °C]
const STATES=[['DL','Delhi NCR',0,['New Delhi','Gurugram'],9,27],['HR','Haryana',0,['Faridabad','Karnal'],3,26],['PB','Punjab',0,['Ludhiana','Amritsar'],3,25],['RJ','Rajasthan',0,['Jaipur','Jodhpur'],5,29],['GJ','Gujarat',0,['Ahmedabad','Surat'],7,29],['MP','Madhya Pradesh',0,['Indore','Bhopal'],4,27],['UP','Uttar Pradesh',0,['Lucknow','Noida','Kanpur'],9,27],['TS','Telangana',0,['Hyderabad'],6,28],
 ['MH','Maharashtra',1,['Mumbai','Pune','Nagpur'],12,28],['GA','Goa',1,['Panaji'],1,28],['KL','Kerala',1,['Kochi','Thiruvananthapuram'],5,28],['TN','Tamil Nadu',1,['Chennai','Coimbatore'],9,29],['AP','Andhra Pradesh',1,['Visakhapatnam','Vijayawada'],4,29],['OD','Odisha',1,['Bhubaneswar'],3,28],['WB','West Bengal',1,['Kolkata','Siliguri'],5,27],
 ['KA','Karnataka',2,['Bengaluru','Mysuru','Hubballi'],10,25],['CG','Chhattisgarh',2,['Raipur'],2,27],['JH','Jharkhand',2,['Ranchi'],2,25],['BR','Bihar',2,['Patna'],3,26],['AS','Assam & North-East',2,['Guwahati'],2,25],
 ['JK','Jammu & Kashmir, Ladakh',3,['Jammu','Srinagar'],1,15],['HP','Himachal Pradesh',3,['Shimla'],1,16],['UK','Uttarakhand',3,['Dehradun'],2,20]];
const STATE=Object.fromEntries(STATES.map(s=>[s[0],{code:s[0],name:s[1],zone:ZONES[s[2]],cities:s[3],amb:s[5]}]));
const ROUGH=['BR','JH','UP','AS','OD','MP','CG'],POORGRID=['UP','BR','JH','AS','OD'];
const USAGE={'2W':[['Personal',.58],['Delivery',.32],['Ride-hail',.1]],'3W':[['Passenger carrier',.45],['Cargo',.55]],'CAR':[['Personal',.68],['Ride-hail',.22],['Corporate fleet',.1]],'LCV':[['Delivery',.7],['Fleet',.3]],'BUS':[['City transit',.8],['Intercity',.2]],'TRK':[['Regional haul',1]]};
const USEMULT={'Personal':1,'Delivery':1.9,'Ride-hail':2.6,'Passenger carrier':1.1,'Cargo':1,'Corporate fleet':1.5,'Fleet':1.2,'City transit':1,'Intercity':1.5,'Regional haul':1};
const PLANTS={Hosur:['L1','L2'],Pune:['L1','L2','L3'],Chennai:['L1','L2','L3'],Dharwad:['L1','L2']};
const SHIFTS=[['A',.4],['B',.35],['C',.25]];

/* Components. base=[Weibull shape, scale in months] for ordinary wear and random failures; part=part cost for a car in rupees;
   lab=labour hours; safety 0-3; stop=true when a failure leaves the vehicle unable to drive or charge; cats=KPI categories the component shows up in. */
const COMPS=[
 {id:'bat',name:'Battery pack',sys:'HV battery',base:[1.5,1400],part:185000,lab:7,safety:3,stop:true,cats:[5,7],sup:['IC','ZE'],exclude:[]},
 {id:'bms',name:'Battery management system',sys:'HV battery',base:[1.2,900],part:28000,lab:2.5,safety:2,stop:true,cats:[5,1],sup:['PC','VE'],exclude:[]},
 {id:'mot',name:'Traction motor',sys:'Drive motor and inverter',base:[1.4,1100],part:95000,lab:6,safety:2,stop:true,cats:[6],sup:['SD','TE'],exclude:[]},
 {id:'inv',name:'Inverter',sys:'Drive motor and inverter',base:[1.3,1000],part:78000,lab:4,safety:2,stop:true,cats:[6,7],sup:['SD','VE'],exclude:[]},
 {id:'obc',name:'On-board charger',sys:'Charging',base:[1.2,800],part:52000,lab:3,safety:1,stop:true,cats:[9],sup:['VE','TE'],exclude:[]},
 {id:'dcdc',name:'DC-DC converter',sys:'DC/DC and 12 V',base:[1.2,950],part:24000,lab:2,safety:1,stop:true,cats:[8],sup:['VE','PC'],exclude:[]},
 {id:'port',name:'Charge port and inlet',sys:'Charging',base:[1.3,700],part:14000,lab:1.5,safety:2,stop:false,cats:[9],sup:['AC','NH'],exclude:[]},
 {id:'pump',name:'Coolant pump and thermal loop',sys:'Battery thermal',base:[1.5,800],part:11000,lab:2,safety:2,stop:false,cats:[7,5],sup:['KT','NP'],exclude:['2W','3W']},
 {id:'cont',name:'HV contactor and junction box',sys:'HV safety',base:[1.4,1200],part:19000,lab:4,safety:3,stop:true,cats:[9,1],sup:['MC','TE'],exclude:[]},
 {id:'lv',name:'12 V battery',sys:'DC/DC and 12 V',base:[2.2,115],part:6500,lab:.5,safety:0,stop:true,cats:[8],sup:['SB','GL'],exclude:[]},
 {id:'tcu',name:'Telematics and vehicle control unit',sys:'Control and network',base:[1.1,1500],part:21000,lab:1.5,safety:1,stop:false,cats:[8,1],sup:['OT','PC'],exclude:[]},
 {id:'brk',name:'Brake and regeneration system',sys:'Brakes and body',base:[1.6,600],part:16000,lab:2.5,safety:3,stop:false,cats:[11,12],sup:['DB','KC'],exclude:[]},
 {id:'sus',name:'Suspension and steering',sys:'Chassis',base:[1.7,420],part:12000,lab:2.5,safety:2,stop:false,cats:[4,11],sup:['MS','KC'],exclude:[]},
 {id:'hvac',name:'HVAC compressor',sys:'Climate and heat pump',base:[1.5,700],part:46000,lab:3.5,safety:0,stop:false,cats:[10],sup:['SC','NP'],exclude:['2W','3W']},
 {id:'info',name:'Infotainment and cluster',sys:'Control and network',base:[1.0,1500],part:32000,lab:1,safety:0,stop:false,cats:[1],sup:['LD','OT'],exclude:['3W']},
 {id:'har',name:'Wiring harness and connectors',sys:'HV safety',base:[1.1,1000],part:9000,lab:3,safety:2,stop:false,cats:[1],sup:['NH','AC'],exclude:[]}];
const COMP=Object.fromEntries(COMPS.map(c=>[c.id,c]));
const SUPPLIERS={IC:'Indus Cell Works',ZE:'Zenith Energy Cells',PC:'Pragati Controls',VE:'Vajra Power Electronics',SD:'Sahyadri Drives',TE:'Triveni Electricals',AC:'Aravalli Connect',NH:'Nilgiri Harness',KT:'Kaveri Thermal Systems',NP:'Northfield Pumps',MC:'Meridian Contactors',SB:'Shakti Batteries',GL:'Ganga Lead Works',OT:'Orbit Telematics',DB:'Deccan Brakes',KC:'Konkan Chassis',MS:'Malwa Suspension',SC:'Suvarna Climate',LD:'Lumina Displays'};
const LABOUR_RATE=950;

/* Component health indicators: vehicle-level measures derived from telemetry that move before a part fails.
   [key, name, description, unit, low, high, typical, component, bad direction, noise as a share of the span] */
const HEALTH=[
 ['cell_v_spread_mv','Cell voltage spread','Highest minus lowest cell voltage at rest','mV',0,160,18,'bat','hi',.035],
 ['soh_pct','Battery state of health','Usable capacity against the capacity when new','%',60,100,95.5,'bat','lo',.03],
 ['pack_dt_c','Module temperature gap','Hottest module minus the pack mean while driving or charging','°C',0,16,2.6,'bat','hi',.05],
 ['ir_growth_pct','Internal resistance growth','Rise in pack internal resistance since new','%',0,70,7,'bat','hi',.05],
 ['thermal_events_1000km','Thermal events','Pack over-temperature events per 1,000 km','per 1,000 km',0,6,.12,'bat','hi',.02],
 ['derate_events_1000km','Power derate events','Times the battery limited power per 1,000 km','per 1,000 km',0,9,.25,'bat','hi',.025],
 ['soc_jump_events','State of charge jumps','Sudden corrections of displayed charge per month','per month',0,20,.3,'bms','hi',.02],
 ['balance_time_h','Cell balancing time','Hours the pack spends balancing per week','h per week',0,40,3.2,'bms','hi',.04],
 ['bms_reset_count','BMS resets','Unplanned battery controller restarts per month','per month',0,12,.1,'bms','hi',.015],
 ['pump_current_a','Coolant pump current','Mean pump current at commanded full speed','A',2,14,5.2,'pump','hi',.03],
 ['coolant_flow_dev_pct','Coolant flow shortfall','Estimated flow below the commanded flow','%',0,60,4.5,'pump','hi',.03],
 ['coolant_dt_c','Coolant temperature rise','Outlet minus inlet coolant temperature under load','°C',0,16,4.1,'pump','hi',.04],
 ['precharge_ms','Precharge time','Time for the HV bus to reach pack voltage at start-up','ms',80,700,215,'cont','hi',.025],
 ['contactor_open_ms','Contactor opening time','Time from the open command to current reaching zero','ms',5,120,18,'cont','hi',.03],
 ['insulation_kohm','Insulation resistance','HV bus to chassis isolation resistance','kΩ',100,5000,2600,'har','lo',.06],
 ['hvil_dropouts','Interlock dropouts','High-voltage interlock interruptions per month','per month',0,20,.25,'har','hi',.015],
 ['v12_rest_v','12 V resting voltage','Low-voltage battery voltage after 6 hours parked','V',10.8,13.2,12.62,'lv','lo',.035],
 ['parked_drain_pct_day','Parked drain','12 V state of charge lost per parked day','% per day',0,6,.45,'tcu','hi',.03],
 ['sleep_current_ma','Sleep current','Vehicle quiescent current after shutdown','mA',5,420,28,'tcu','hi',.02],
 ['wake_events_day','Unplanned wake-ups','Network wake-ups while parked, per day','per day',0,220,12,'tcu','hi',.025],
 ['resolver_err_deg','Motor position error','Resolver angle error against the estimated rotor angle','°',0,7,.45,'mot','hi',.03],
 ['torque_ripple_pct','Torque ripple','Share of commanded torque seen as ripple','%',0,22,3.1,'mot','hi',.035],
 ['motor_temp_rise','Motor temperature rise','Stator temperature rise per kW of mean load','°C per kW',0,3.2,.82,'mot','hi',.04],
 ['inv_temp_rise_c','Inverter temperature rise','Power-stage temperature above coolant under load','°C',0,70,21,'inv','hi',.035],
 ['inv_derate_1000km','Inverter derate events','Times the inverter limited torque per 1,000 km','per 1,000 km',0,12,.2,'inv','hi',.02],
 ['inv_thermal_cycles','Inverter thermal cycles','Large power-stage temperature swings per day','per day',0,120,22,'inv','hi',.05],
 ['obc_eff_pct','On-board charger efficiency','AC energy in against DC energy delivered','%',80,97,93.6,'obc','lo',.035],
 ['obc_temp_c','On-board charger temperature','Peak charger temperature during AC charging','°C',30,98,53,'obc','hi',.04],
 ['ac_interrupts_100','AC charge interruptions','Unplanned stops per 100 AC sessions','per 100 sessions',0,30,1.3,'obc','hi',.025],
 ['port_temp_rise_c','Charge port temperature rise','Inlet temperature above ambient at rated current','°C',0,65,14,'port','hi',.035],
 ['pilot_dropouts_100','Control pilot dropouts','Pilot signal losses per 100 sessions','per 100 sessions',0,20,.7,'port','hi',.025],
 ['dc_fail_pct','DC session failures','Share of DC sessions that did not complete','%',0,40,3.2,'port','hi',.03],
 ['dcdc_out_v','DC-DC output voltage','Mean 12 V bus voltage with the vehicle in READY','V',12.4,14.8,13.92,'dcdc','lo',.03],
 ['comp_current_a','A/C compressor current','Compressor current at a standard cooling demand','A',2,32,9.4,'hvac','hi',.035],
 ['cabin_pulldown_min','Cabin pull-down time','Minutes to bring the cabin to the set point','min',2,32,7.5,'hvac','hi',.05],
 ['brake_blend_err_pct','Brake blending error','Gap between requested and delivered deceleration','%',0,20,2.1,'brk','hi',.035],
 ['susp_vert_rms','Vertical acceleration','Body vertical acceleration on a standard road class','m/s² rms',.2,3.2,.82,'sus','hi',.04],
 ['steer_free_play_deg','Steering free play','Steering angle travel before the vehicle responds','°',0,8,1.2,'sus','hi',.04],
 ['ivi_reboots_100h','Infotainment restarts','Unplanned head-unit restarts per 100 hours','per 100 h',0,40,.9,'info','hi',.02],
 ['can_err_day','CAN error frames','Network error frames per day','per day',0,500,7,'tcu','hi',.015]];

/* Planted quality issues. Each one drives claims, fault codes, signal drift and predictions for the vehicles in its cohort, so every
   module tells the same story. pred picks the cohort; accel says what shortens life; seq is the fault-code order; sig lists the health
   indicators that move and by how many standard deviations at failure. */
const HOT=v=>v.zone===ZONES[0],COAST=v=>v.zone===ZONES[1],HILL=v=>v.zone===ZONES[3];
const ISSUES=[
 {id:'Q-101',name:'Coolant pump bearing wear',comp:'pump',models:['KX5'],safety:2,status:'Root cause confirmed',owner:'Thermal systems specialist',
  mode:'Pump current climbs, coolant flow falls and the pack runs hot under load; the car derates and finally sets an over-temperature fault.',
  cause:'Bearing grease specification was changed at the pump supplier. Pumps from Kaveri Thermal Systems built January to June 2025 are affected.',causeType:'Supplier part',
  fix:'Replace with pump revision C, in risk order. Supplier process corrected from lot KT-2507.',
  pred:v=>v.model==='KX5'&&v.lots.pump.startsWith('KT-')&&v.buildM>=14&&v.buildM<=19,k:2.4,eta:36,accel:v=>(HOT(v)?1.7:COAST(v)?1.2:1)*(v.usage==='Ride-hail'?1.35:1),
  seq:['P0C4A','P0C32','P0A7E'],lead:75,sigLead:160,sig:[['pump_current_a',3.2],['coolant_flow_dev_pct',3.6],['coolant_dt_c',2.6],['pack_dt_c',1.9],['derate_events_1000km',2.2]],cats:[7,5],nff:.05,claimAs:null},
 {id:'Q-102',name:'Cell balancing fault after software 3.2.0',comp:'bms',models:['ZS1'],safety:2,status:'Countermeasure in field',owner:'Battery systems specialist',
  mode:'Balancing stops on one cell group. Cell spread grows, usable range falls and the scooter cuts power at low charge.',
  cause:'A balancing threshold was set wrongly in BMS software 3.2.0. Vehicles on 3.2.0 are affected until they take 3.2.1.',causeType:'Software',
  fix:'Over-the-air update 3.2.1. Packs already replaced under warranty were not at fault.',
  pred:v=>v.model==='ZS1'&&v.sw==='3.2.0',k:1.7,eta:30,accel:v=>(v.usage==='Delivery'?1.5:v.usage==='Ride-hail'?1.3:1)*(HOT(v)?1.2:1),
  seq:['P0DAB','P0BBD','P0DE6'],lead:55,sigLead:110,sig:[['cell_v_spread_mv',3.8],['balance_time_h',3],['soc_jump_events',2.4],['soh_pct',-1.6]],cats:[5],nff:.08,claimAs:[['bms',.7],['bat',.3]]},
 {id:'Q-103',name:'Main contactor contact erosion',comp:'cont',models:['LV1'],safety:3,status:'Investigating',owner:'High-voltage safety specialist',
  mode:'Precharge takes longer, the contactor opens slowly, then sticks open (no start) or welds closed (bus stays live).',
  cause:'Suspected contact plating thickness below specification in Meridian Contactors lots from September 2024 to March 2025. Frequent DC fast charging accelerates it.',causeType:'Supplier part',
  fix:'Containment: inspect and replace the junction box on the highest-risk vans first. Supplier teardown in progress.',
  pred:v=>v.model==='LV1'&&v.lots.cont.startsWith('MC-')&&v.buildM>=10&&v.buildM<=16,k:2.1,eta:44,accel:v=>(v.dc>.5?1.9:v.dc>.3?1.3:1)*(v.usage==='Delivery'?1.2:1),
  seq:['P0C78','P0AA2','P0AA1'],lead:60,sigLead:140,sig:[['precharge_ms',3.5],['contactor_open_ms',3.2],['dc_fail_pct',1.6]],cats:[9,1],nff:.04,claimAs:null},
 {id:'Q-104',name:'Charge inlet overheating from seal corrosion',comp:'port',models:['TC3'],safety:3,status:'Investigating',owner:'Charging systems specialist',
  mode:'Moisture enters the inlet, contact resistance rises, the inlet runs hot and charging stops; isolation faults follow.',
  cause:'Inlet seal was seated by hand on Pune line L2 between March and July 2025 while a fixture was out for repair. Coastal humidity accelerates corrosion.',causeType:'Assembly process',
  fix:'Reseal and replace inlet on affected vehicles, coastal states first. Fixture restored and seating now checked by camera.',
  pred:v=>v.model==='TC3'&&v.line==='L2'&&v.buildM>=16&&v.buildM<=20,k:1.9,eta:34,accel:v=>(COAST(v)?2.3:1)*(v.usage==='Cargo'?1.15:1),
  seq:['P0D9A','P0CF4','P0DAA'],lead:50,sigLead:120,sig:[['port_temp_rise_c',3.6],['pilot_dropouts_100',2.8],['dc_fail_pct',2],['insulation_kohm',-2.2]],cats:[9],nff:.05,claimAs:null},
 {id:'Q-105',name:'Bus A/C compressor drive failure in heat',comp:'hvac',models:['CB12'],safety:1,status:'Root cause confirmed',owner:'Climate systems specialist',
  mode:'Compressor draws more current for the same cooling, pull-down slows, then the compressor drive trips and the cabin loses cooling.',
  cause:'Compressor drive capacitors under-rated for sustained high ambient duty. Suvarna Climate units built July 2024 to May 2025.',causeType:'Design margin',
  fix:'Fit uprated drive module at the next depot visit, hot-zone depots first.',
  pred:v=>v.model==='CB12'&&v.lots.hvac.startsWith('SC-')&&v.buildM>=8&&v.buildM<=18,k:2.3,eta:36,accel:v=>(HOT(v)?2.1:COAST(v)?1.3:1),
  seq:['P0D69','P0D6D','P0EC6'],lead:65,sigLead:150,sig:[['comp_current_a',3.4],['cabin_pulldown_min',3]],cats:[10],nff:.03,claimAs:null},
 {id:'Q-106',name:'12 V battery drain: control unit not sleeping',comp:'tcu',models:['KC3','KX5','LV1'],safety:1,status:'Emerging',owner:'Electrical and network specialist',
  mode:'The telematics unit keeps the network awake while parked. The 12 V battery runs flat, the car will not start, and a new battery fails again.',
  cause:'Telematics firmware 1.8.2 does not release a network wake request after a failed data upload. Dealers replace the 12 V battery, which is not at fault.',causeType:'Software',
  fix:'Not yet decided. Proposed: firmware 1.8.4 over the air, and stop 12 V battery replacement for this symptom.',
  pred:v=>['KC3','KX5','LV1'].includes(v.model)&&v.tcu==='1.8.2',k:1.3,eta:36,accel:v=>(v.usage==='Personal'?1.4:.8),
  seq:['P0D1F','P0561','P0562'],lead:35,sigLead:90,sig:[['sleep_current_ma',3.8],['wake_events_day',3.6],['parked_drain_pct_day',3.2],['v12_rest_v',-2.6]],cats:[8],nff:.7,claimAs:[['lv',.74],['tcu',.26]]},
 {id:'Q-107',name:'Motor position sensor connector not fully seated',comp:'mot',models:['ZM2'],safety:2,status:'Investigating',owner:'Drive unit specialist',
  mode:'Intermittent position signal causes jerks and loss of drive. Motors are replaced and tested fault-free at the supplier.',
  cause:'Connector seating not verified at Hosur line L2 on shift B between November 2025 and April 2026 after a tooling change.',causeType:'Assembly process',
  fix:'Reseat and lock the connector; do not replace the motor. Seating force check added to the station.',
  pred:v=>v.model==='ZM2'&&v.line==='L2'&&v.shift==='B'&&v.buildM>=24&&v.buildM<=29,k:.9,eta:24,accel:v=>(ROUGH.includes(v.st)?1.6:1)*(v.usage==='Delivery'?1.3:1),
  seq:['P0A43','P0A40','P0A3F'],lead:30,sigLead:60,sig:[['resolver_err_deg',3.8],['torque_ripple_pct',2.6]],cats:[6],nff:.45,claimAs:null},
 {id:'Q-108',name:'On-board charger failure on unstable grids',comp:'obc',models:['KC3'],safety:1,status:'Emerging',owner:'Charging systems specialist',
  mode:'Charger runs hot, efficiency drops and AC sessions stop; finally the charger output fails.',
  cause:'Input-stage component in Vajra Power Electronics chargers built November 2024 to April 2025 has low surge margin. Failures cluster where grid voltage swings.',causeType:'Supplier part',
  fix:'Not yet decided. Proposed: supplier review of the input stage and a surge test on returned units.',
  pred:v=>v.model==='KC3'&&v.lots.obc.startsWith('VE-')&&v.buildM>=12&&v.buildM<=17,k:1.8,eta:40,accel:v=>(POORGRID.includes(v.st)?2.2:1),
  seq:['P0D24','P0D20','P0D23'],lead:45,sigLead:110,sig:[['obc_temp_c',3.2],['obc_eff_pct',-3],['ac_interrupts_100',3]],cats:[9],nff:.12,claimAs:null},
 {id:'Q-109',name:'Launch: infotainment restarts on software 1.0.3',comp:'info',models:['KS4'],safety:0,status:'Investigating',owner:'Electrical and network specialist',
  mode:'The head unit restarts while driving; cluster and camera views go blank for several seconds.',
  cause:'Memory leak in the navigation service in launch software 1.0.3.',causeType:'Software',
  fix:'Software 1.0.5 over the air; built into production from August 2026.',
  pred:v=>v.model==='KS4'&&v.sw==='1.0.3',k:.9,eta:55,accel:v=>(v.usage==='Ride-hail'?1.5:1),
  seq:['P0602','P0601'],lead:20,sigLead:45,sig:[['ivi_reboots_100h',4],['can_err_day',1.5]],cats:[1],nff:.2,claimAs:null},
 {id:'Q-110',name:'Truck inverter power-stage fatigue on gradients',comp:'inv',models:['HT16'],safety:2,status:'Investigating',owner:'Drive unit specialist',
  mode:'Repeated heavy climbs and descents swing the power-stage temperature. Derates become frequent, then the inverter faults.',
  cause:'Power-module bond fatigue under thermal cycling on hill routes; Sahyadri Drives inverters built May 2024 to June 2025.',causeType:'Design margin',
  fix:'Software derate strategy revised as containment. Uprated module under validation.',
  pred:v=>v.model==='HT16'&&v.lots.inv.startsWith('SD-')&&v.buildM>=6&&v.buildM<=19,k:2.6,eta:36,accel:v=>(HILL(v)?2:1)*(v.payload>.6?1.4:1),
  seq:['P0AEE','P0A93','P0A3C','P0A78'],lead:70,sigLead:150,sig:[['inv_temp_rise_c',3.2],['inv_thermal_cycles',3],['inv_derate_1000km',3.4]],cats:[6,7],nff:.04,claimAs:null},
 {id:'Q-111',name:'Battery module weld weakness: thermal risk',comp:'bat',models:['KC3'],safety:3,status:'Investigating',owner:'Battery systems specialist',
  mode:'A weak cell-tab weld raises resistance in one module. That module runs hot on fast charge, voltage sense becomes implausible, and the pack sets an over-temperature fault.',
  cause:'Suspected laser weld energy drift at Indus Cell Works on modules built July to October 2025. Fast charging and heat accelerate it.',causeType:'Supplier part',
  fix:'Limit DC charge power over the air on the highest-risk cars now; inspect and replace modules in risk order.',
  pred:v=>v.model==='KC3'&&v.lots.bat.startsWith('IC-')&&v.buildM>=20&&v.buildM<=23,k:1.6,eta:72,accel:v=>(v.dc>.45?1.8:v.dc>.25?1.25:1)*(HOT(v)?1.4:1),
  seq:['P0ABB','P0BBD','P0A9C','P0A7E'],lead:60,sigLead:150,sig:[['pack_dt_c',3.8],['ir_growth_pct',3.4],['cell_v_spread_mv',2.6],['thermal_events_1000km',3],['soh_pct',-1.4]],cats:[7,5,9],nff:.02,claimAs:null},
 {id:'Q-112',name:'Launch: rear suspension bush noise',comp:'sus',models:['KS4'],safety:1,status:'Emerging',owner:'Chassis specialist',
  mode:'Knocking from the rear over broken roads; bush wears early and handling becomes loose.',
  cause:'Rear bush press-fit force low on Chennai line L3 for sedans built May to July 2026.',causeType:'Assembly process',
  fix:'Not yet decided. Proposed: press-force audit on line L3 and bush replacement on complaint.',
  pred:v=>v.model==='KS4'&&v.buildM>=30&&v.buildM<=32,k:1.0,eta:80,accel:v=>(ROUGH.includes(v.st)?2:1),
  seq:[],lead:0,sigLead:60,sig:[['susp_vert_rms',3.4],['steer_free_play_deg',2.2]],cats:[4,11],nff:.1,claimAs:null}];
const ISSUE=Object.fromEntries(ISSUES.map(x=>[x.id,x]));
const STATUS_ORDER=['Emerging','Investigating','Root cause confirmed','Countermeasure in field','Monitoring'];
const SPECIALISTS=['Battery systems specialist','Thermal systems specialist','High-voltage safety specialist','Charging systems specialist','Drive unit specialist','Electrical and network specialist','Climate systems specialist','Chassis specialist'];
const OWNER_OF={bat:'Battery systems specialist',bms:'Battery systems specialist',pump:'Thermal systems specialist',cont:'High-voltage safety specialist',har:'High-voltage safety specialist',port:'Charging systems specialist',obc:'Charging systems specialist',mot:'Drive unit specialist',inv:'Drive unit specialist',dcdc:'Electrical and network specialist',lv:'Electrical and network specialist',tcu:'Electrical and network specialist',info:'Electrical and network specialist',hvac:'Climate systems specialist',brk:'Chassis specialist',sus:'Chassis specialist'};
