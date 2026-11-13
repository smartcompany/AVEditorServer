-- ClipGo (AVEditor) usage analytics.
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- The app posts anonymous events (random install id, no account data) to
-- POST /api/events; the server writes them with the service role key.
-- The dashboard reads aggregates through the two functions below.

create table if not exists public.aveditor_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  install_id  text        not null,
  platform    text,
  app_version text,
  event       text        not null,
  props       jsonb       not null default '{}'::jsonb
);

create index if not exists aveditor_events_created_at_idx
  on public.aveditor_events (created_at desc);
create index if not exists aveditor_events_event_created_idx
  on public.aveditor_events (event, created_at desc);
create index if not exists aveditor_events_install_idx
  on public.aveditor_events (install_id);

-- Only the service role (server) touches this table.
alter table public.aveditor_events enable row level security;

-- Totals per event: how many times, and by how many distinct installs.
create or replace function public.aveditor_event_totals(
  p_since timestamptz,
  p_platform text default null
)
returns table (event text, events bigint, installs bigint)
language sql stable
as $$
  select e.event,
         count(*)::bigint                    as events,
         count(distinct e.install_id)::bigint as installs
  from public.aveditor_events e
  where e.created_at >= p_since
    and (p_platform is null or e.platform = p_platform)
  group by e.event
  order by events desc;
$$;

-- Daily counts per event (UTC days).
create or replace function public.aveditor_event_daily(
  p_since timestamptz,
  p_platform text default null
)
returns table (day date, event text, events bigint, installs bigint)
language sql stable
as $$
  select (e.created_at at time zone 'utc')::date as day,
         e.event,
         count(*)::bigint                    as events,
         count(distinct e.install_id)::bigint as installs
  from public.aveditor_events e
  where e.created_at >= p_since
    and (p_platform is null or e.platform = p_platform)
  group by 1, 2
  order by 1, 2;
$$;

-- Most used catalog items (transition / text look) by event + props.id.
create or replace function public.aveditor_top_items(
  p_since timestamptz,
  p_event text,
  p_limit int default 20
)
returns table (item_id text, premium boolean, events bigint, installs bigint)
language sql stable
as $$
  select e.props->>'id'                              as item_id,
         coalesce((e.props->>'premium')::boolean, false) as premium,
         count(*)::bigint                            as events,
         count(distinct e.install_id)::bigint        as installs
  from public.aveditor_events e
  where e.created_at >= p_since
    and e.event = p_event
    and e.props ? 'id'
  group by 1, 2
  order by events desc
  limit p_limit;
$$;

revoke all on function public.aveditor_event_totals(timestamptz, text) from public, anon, authenticated;
revoke all on function public.aveditor_event_daily(timestamptz, text) from public, anon, authenticated;
revoke all on function public.aveditor_top_items(timestamptz, text, int) from public, anon, authenticated;
