-- EasyClip credits + lightweight users.
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- All tables MUST be prefixed with aveditor_.

create table if not exists public.aveditor_credit_accounts (
  id           uuid primary key default gen_random_uuid(),
  device_key   text unique not null,
  firebase_uid text unique,
  balance      integer not null default 0 check (balance >= 0),
  plan_tier    text not null default 'free'
               check (plan_tier in ('free', 'plus', 'pro', 'studio')),
  -- Calendar month of the last subscription credit grant, e.g. '2026-11'.
  last_credit_grant_ym text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Safe for existing projects that already ran an older credits.sql.
alter table public.aveditor_credit_accounts
  add column if not exists last_credit_grant_ym text;

create index if not exists aveditor_credit_accounts_firebase_uid_idx
  on public.aveditor_credit_accounts (firebase_uid)
  where firebase_uid is not null;

create table if not exists public.aveditor_credit_ledger (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.aveditor_credit_accounts(id) on delete cascade,
  delta      integer not null,
  reason     text not null,
  ref        text,
  created_at timestamptz not null default now()
);

create index if not exists aveditor_credit_ledger_account_created_idx
  on public.aveditor_credit_ledger (account_id, created_at desc);

create table if not exists public.aveditor_app_users (
  firebase_uid  text primary key,
  display_name  text,
  email         text,
  photo_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.aveditor_credit_accounts enable row level security;
alter table public.aveditor_credit_ledger enable row level security;
alter table public.aveditor_app_users enable row level security;
