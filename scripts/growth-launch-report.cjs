// Read-only aggregates. Never output raw identifiers, URLs, user agents or free text.
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
loadEnvConfig(process.cwd());
const start = '2026-09-08T15:12:53.000Z'; // Published Instagram post timestamp
const key = process.env.SUPABASE_SERVICE_KEY;
if (!key) throw new Error('Reporting credentials unavailable');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false } });
(async () => {
  const rows = [];
  const end = new Date().toISOString();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('user_events')
      .select('session_id,event_type,created_at,user_agent,campaign:props->>utm_campaign,source:props->>utm_source')
      .gte('created_at', '2026-09-07T00:00:00Z').lt('created_at', end)
      .order('created_at').order('id').range(offset, offset + 999);
    if (error) throw new Error(`Report failed (${error.code ?? 'unknown'})`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  const qa = new Set(rows.filter(r => r.campaign === 'codex_qa').map(r => r.session_id).filter(Boolean));
  const groups = {};
  let excluded = 0;
  for (const r of rows) {
    if (r.created_at < start) continue;
    if (qa.has(r.session_id) || /bot|spider|crawler|headless|lighthouse/i.test(r.user_agent || '')) { excluded++; continue; }
    const name = r.campaign === 'first_teams_202609' ? 'instagram_campaign' : 'other_or_unknown';
    const g = groups[name] ??= { sessions: new Map(), events: {} };
    g.events[r.event_type] = (g.events[r.event_type] || 0) + 1;
    if (!r.session_id) continue;
    if (!g.sessions.has(r.session_id)) g.sessions.set(r.session_id, { detail: false, contact: false, after_detail: false });
    const s = g.sessions.get(r.session_id);
    if (r.event_type === 'studio_view') s.detail = true;
    if (r.event_type === 'contact_click') { s.contact = true; s.after_detail ||= s.detail; }
  }
  const result = {};
  for (const [name, g] of Object.entries(groups)) {
    const sessions = [...g.sessions.values()];
    result[name] = { browser_sessions: sessions.length, detail_sessions: sessions.filter(s => s.detail).length,
      contact_sessions: sessions.filter(s => s.contact).length, contact_after_detail_sessions: sessions.filter(s => s.after_detail).length, events: g.events };
  }
  console.log(JSON.stringify({ start_utc: start, end_exclusive_utc: end, excluded_known_bot_or_tagged_qa_events: excluded,
    limitations: ['Untagged operator or QA sessions cannot be excluded reliably.', 'Sessions are not people; contact clicks are not completed bookings.', 'Campaign attribution does not establish that this particular post caused the visit.'], groups: result }, null, 2));
})().catch(e => { console.error(e.message); process.exitCode = 1; });
