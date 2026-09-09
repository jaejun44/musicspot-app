// Read-only aggregate baseline before Codex QA began. No row or identifier output.
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
loadEnvConfig(process.cwd());
const key = process.env.SUPABASE_SERVICE_KEY;
if (!key) throw new Error('Reporting credentials unavailable');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false } });
const start='2026-08-25T00:00:00.000Z', end='2026-09-07T00:00:00.000Z';
(async()=>{
  const rows=[];
  for(let n=0;;n+=1000){
    const {data,error}=await db.from('user_events').select('session_id,event_type,created_at,referrer,user_agent,source:props->>utm_source,referrer_host:props->>referrer_host')
      .gte('created_at',start).lt('created_at',end).order('created_at').order('id').range(n,n+999);
    if(error)throw new Error(`Query failed (${error.code ?? 'unknown'})`);
    rows.push(...data);if(data.length<1000)break;
  }
  const sessions=new Map(), events={}, days={};
  let knownBotEvents=0;
  for(const row of rows){
    if(/bot|spider|crawler|headless|lighthouse/i.test(row.user_agent ?? '')){knownBotEvents++;continue;}
    events[row.event_type]=(events[row.event_type]??0)+1;
    const day=row.created_at.slice(0,10);days[day]??={events:0,contacts:0};days[day].events++;if(row.event_type==='contact_click')days[day].contacts++;
    if(!row.session_id)continue;
    if(!sessions.has(row.session_id))sessions.set(row.session_id,{view:false,contact:false,afterView:false,source:'direct_or_unknown',search:false});
    const s=sessions.get(row.session_id);
    let host=row.referrer_host;
    try{ if(!host&&row.referrer)host=new URL(row.referrer).hostname; }catch{}
    const src=['instagram','ig'].includes(row.source)?'instagram':host&&host!=='internal'&&host!=='direct'&&!host.includes('musicspotfest.com')?host:'direct_or_unknown';
    if(s.source==='direct_or_unknown')s.source=src;
    if(row.event_type==='studio_view')s.view=true;
    if(row.event_type==='search')s.search=true;
    if(row.event_type==='contact_click'){s.contact=true;if(s.view)s.afterView=true;}
  }
  const sources={};
  for(const s of sessions.values()){sources[s.source]??={sessions:0,detail_sessions:0,contact_sessions:0,contact_after_detail_sessions:0};const g=sources[s.source];g.sessions++;if(s.view)g.detail_sessions++;if(s.contact)g.contact_sessions++;if(s.afterView)g.contact_after_detail_sessions++;}
  console.log(JSON.stringify({start_utc:start,end_exclusive_utc:end,notes:['User reports no operator logins or checks in this period.','Period excludes Codex QA from September 7 onward.','Session counts are not unique humans; unrecognized bots may remain.','contact_click means button click, not completed booking.'],events,known_bot_events_excluded:knownBotEvents,distinct_browser_sessions:sessions.size,sources,days},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
