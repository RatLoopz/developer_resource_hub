-- ============================================================
-- Developer Resource Hub — Master Database Schema
-- Run this in your Supabase SQL Editor
-- This script contains: Profiles, Links, Reels, and Automation
-- ============================================================

-- 1. PROFILES TABLE (extends auth.users)
-- Stores extra user info like full name, role, and telegram linking
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text default 'user' check (role in ('user', 'admin')),
  telegram_id text unique,
  telegram_link_token text unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. LINKS TABLE
-- For the main directory of links
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text not null,
  description text,
  categories text[] default '{}',
  icon_url text,
  icon_data_url text,
  status text default 'active' check (status in ('active', 'inactive', 'broken')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. REELS TABLE
-- For the Reels Vault
create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_url text not null,
  thumbnail_url text,
  title text,
  notes text,
  tags text[] default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ============================================================
-- ENABLE RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.links enable row level security;
alter table public.reels enable row level security;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if current user is an admin without recursion
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- PROFILES Policies
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- LINKS Policies
drop policy if exists "links_select_public" on public.links;
drop policy if exists "links_manage_own" on public.links;
drop policy if exists "links_manage_admin" on public.links;

-- Public can view active links
create policy "links_select_public" on public.links for select using (status = 'active');
-- Users manage their own
create policy "links_manage_own" on public.links 
  for all using (auth.uid() = user_id);
-- Admins manage all
create policy "links_manage_admin" on public.links 
  for all using (public.is_admin());

-- REELS Policies
drop policy if exists "reels_select_public" on public.reels;
drop policy if exists "reels_manage_own" on public.reels;

-- Anyone can view all reels
create policy "reels_select_public" on public.reels for select using (true);
-- Only logged-in users manage their own
create policy "reels_manage_own" on public.reels 
  for all using (auth.uid() = user_id);


-- ============================================================
-- AUTOMATION: PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_profiles_telegram_id on public.profiles (telegram_id) where telegram_id is not null;
create index if not exists idx_profiles_tg_link_token on public.profiles (telegram_link_token) where telegram_link_token is not null;
