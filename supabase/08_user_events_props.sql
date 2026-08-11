-- user_events 확장: 임의 속성(jsonb) + 유저/국가/언어 축
-- 기존 컬럼(studio_id/studio_name/click_type/search_query)은 기존 쿼리 호환 위해 유지.
-- 8마디·매칭·커뮤니티 이벤트는 전용 컬럼이 없으므로 props에 담는다.

alter table public.user_events
  add column if not exists props    jsonb,
  add column if not exists user_id  uuid,
  add column if not exists country  text,
  add column if not exists language text;

-- 조회 패턴: 이벤트별 최근순 / 유저별 / props 내부 키 필터
create index if not exists user_events_type_created_idx
  on public.user_events (event_type, created_at desc);

create index if not exists user_events_user_created_idx
  on public.user_events (user_id, created_at desc)
  where user_id is not null;

create index if not exists user_events_props_gin_idx
  on public.user_events using gin (props);

comment on column public.user_events.props is
  '이벤트 속성 전체(공통 속성 포함). 스키마는 lib/analytics/events.ts의 EventSchema.';
