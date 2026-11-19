-- EasyClip native store subscriptions (Apple / Google).
-- Run once in Supabase → SQL Editor. Safe to re-run.
-- All tables MUST be prefixed with aveditor_.

create table if not exists public.aveditor_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  firebase_uid             text not null,
  platform                 text not null check (platform in ('ios', 'android')),
  product_id               text not null,
  tier                     text not null
                           check (tier in ('plus', 'pro', 'studio')),
  -- Stable store identity: Apple originalTransactionId or Android purchaseToken.
  store_identity           text not null,
  original_transaction_id  text,
  purchase_token           text,
  status                   text not null default 'active'
                           check (status in (
                             'active',
                             'expired',
                             'refunded',
                             'grace',
                             'billing_retry',
                             'revoked'
                           )),
  expires_at               timestamptz,
  environment              text,
  raw                      jsonb,
  last_verified_at         timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (platform, store_identity)
);

create index if not exists aveditor_subscriptions_uid_idx
  on public.aveditor_subscriptions (firebase_uid);

create index if not exists aveditor_subscriptions_expires_idx
  on public.aveditor_subscriptions (expires_at)
  where status in ('active', 'grace', 'billing_retry');

create index if not exists aveditor_subscriptions_original_tx_idx
  on public.aveditor_subscriptions (original_transaction_id)
  where original_transaction_id is not null;

alter table public.aveditor_subscriptions enable row level security;
