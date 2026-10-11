/* ===== Engine entry point: named queries with a role check on the server ===== */
const RCL_QUERIES=['ev_q_filters','ev_q_recall_candidates','ev_q_recall_issue','ev_q_vehicle','ev_q_vehicle_search','ev_q_blueprint'];
function query(endpoint,params,rid){const fn=Q[endpoint];if(!fn)return{error:'Unknown query '+endpoint,status:404};if(!ROLE[rid])return{error:'Unknown role',status:400};
 if(rid==='RCL'&&!RCL_QUERIES.includes(endpoint))return{error:'This data is not part of the recall office profile.',status:403};
 try{const data=fn(params||{},rid);if(data&&data.error)return{error:data.error,status:data.status||400};return{data};}catch(e){return{error:'Query failed: '+(e&&e.message),status:500};}}
const NATIVE={};
