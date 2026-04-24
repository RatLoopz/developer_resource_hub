-- ============================================================
-- Telegram Multi-User Linking
-- Run in Supabase SQL Editor
-- ============================================================

-- Add telegram_id and link_token columns to profiles
alter table public.profiles
  add column if not exists telegram_id text unique,
  add column if not exists telegram_link_token text unique;

-- Index for fast lookup by telegram_id (bot uses this on every message)
create index if not exists idx_profiles_telegram_id
  on public.profiles (telegram_id)
  where telegram_id is not null;

-- Index for fast token verification
create index if not exists idx_profiles_tg_link_token
  on public.profiles (telegram_link_token)
  where telegram_link_token is not null;
