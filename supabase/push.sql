-- Remote FCM push: device tokens + admin campaigns.
-- Run in Supabase → SQL Editor. Safe to re-run.
-- All tables MUST be prefixed with aveditor_.

create table if not exists public.aveditor_push_tokens (
  id               uuid primary key default gen_random_uuid(),
  device_key       text not null,
  firebase_uid     text,
  token            text not null unique,
  platform         text not null default 'unknown'
                   check (platform in ('ios', 'android', 'web', 'unknown')),
  locale           text not null default 'en'
                   check (locale in ('en', 'ko', 'ja', 'zh')),
  catalog_enabled  boolean not null default true,
  master_enabled   boolean not null default true,
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index if not exists aveditor_push_tokens_device_key_idx
  on public.aveditor_push_tokens (device_key);

create index if not exists aveditor_push_tokens_catalog_idx
  on public.aveditor_push_tokens (catalog_enabled, master_enabled)
  where catalog_enabled = true and master_enabled = true;

create index if not exists aveditor_push_tokens_locale_idx
  on public.aveditor_push_tokens (locale);

create table if not exists public.aveditor_push_campaigns (
  id           uuid primary key default gen_random_uuid(),
  -- catalog = "새 콘텐츠" opt-in recipients
  target       text not null default 'catalog'
               check (target in ('catalog')),
  titles       jsonb not null default '{}'::jsonb,
  bodies       jsonb not null default '{}'::jsonb,
  -- pending | sending | sent | failed
  status       text not null default 'pending',
  send_at      timestamptz,
  sent_at      timestamptz,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  error_message text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.aveditor_push_tokens enable row level security;
alter table public.aveditor_push_campaigns enable row level security;
