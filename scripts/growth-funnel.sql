-- 읽기 전용. 홍보 후 세션별 상세→문의 전환. 개인 식별정보/본문을 반환하지 않음.
with campaign_sessions as (
  select session_id, min(created_at) as entered_at,
    (array_agg(props->>'utm_source' order by created_at)
      filter (where props->>'utm_source' is not null))[1] as source
  from user_events
  where created_at >= now() - interval '14 days'
    and props->>'utm_campaign' = 'first_teams_202609'
    and session_id is not null
  group by session_id
), first_views as (
  select e.session_id, min(e.created_at) as viewed_at
  from user_events e join campaign_sessions c using (session_id)
  where e.created_at >= c.entered_at and e.event_type = 'studio_view'
  group by e.session_id
), contacts as (
  select distinct e.session_id
  from user_events e join first_views v using (session_id)
  where e.event_type = 'contact_click' and e.created_at >= v.viewed_at
)
select coalesce(c.source, 'unknown') as source,
  count(*) as sessions,
  count(v.session_id) as detail_sessions,
  count(k.session_id) as contact_after_detail_sessions,
  round(100.0 * count(k.session_id) / nullif(count(*), 0), 1) as contact_rate_pct
from campaign_sessions c
left join first_views v using (session_id)
left join contacts k using (session_id)
group by 1 order by sessions desc;
