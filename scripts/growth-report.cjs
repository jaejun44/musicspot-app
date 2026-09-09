// Aggregate-only report; never prints rows, user IDs, tokens or free text.
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
loadEnvConfig(process.cwd());
const key = process.env.SUPABASE_SERVICE_KEY;
if (!key) throw new Error('Server-side reporting key is unavailable');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false } });
const since = new Date(Date.now() - 14 * 86400000).toISOString();
(async () => {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('user_events')
      .select('session_id,event_type,created_at,source:props->>utm_source,campaign:props->>utm_campaign')
      .gte('created_at', since).order('created_at', { ascending: true }).order('id', { ascending: true })
      .range(offset, offset + 999);
    if (error) throw new Error(`Aggregate reporting failed (${error.code ?? 'unknown'})`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const counts = {};
  const sessions = new Set();
  const campaignSessions = new Set();
  for (const r of rows) {
    if (r.campaign === 'codex_qa') continue;
    counts[r.event_type] = (counts[r.event_type] ?? 0) + 1;
    if (r.session_id) sessions.add(r.session_id);
    if (r.session_id && r.campaign === 'first_teams_202609') campaignSessions.add(r.session_id);
  }
  console.log(JSON.stringify({ period_start: since, checked_at: new Date().toISOString(),
    warning: 'Event and browser-session counts include untagged operator/QA activity; these are not verified people or bookings.',
    events: counts, browser_sessions: sessions.size, recruitment_campaign_sessions: campaignSessions.size }, null, 2));
})().catch(e => { console.error(e.message); process.exitCode = 1; });
