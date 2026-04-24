-- ============================================================
-- Developer Resource Hub — Full Database Setup
-- Run this ONCE in your Supabase SQL Editor
-- Project: hoimoxiwxulvundbauyb
-- ============================================================

-- 1. PROFILES TABLE (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. LINKS TABLE
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

-- 3. REELS TABLE (public — anyone can view, login to save)
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
-- ENABLE RLS ON ALL TABLES
-- ============================================================
alter table public.profiles enable row level security;
alter table public.links enable row level security;
alter table public.reels enable row level security;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own"   on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"   on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own"   on public.profiles for delete using (auth.uid() = id);

-- Admins can read all profiles
create policy "profiles_select_admin" on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ============================================================
-- LINKS POLICIES
-- ============================================================
drop policy if exists "links_select_active"  on public.links;
drop policy if exists "links_select_own"     on public.links;
drop policy if exists "links_insert_own"     on public.links;
drop policy if exists "links_update_own"     on public.links;
drop policy if exists "links_delete_own"     on public.links;
drop policy if exists "links_select_admin"   on public.links;
drop policy if exists "links_update_admin"   on public.links;
drop policy if exists "links_delete_admin"   on public.links;

-- Public can view active links
create policy "links_select_active" on public.links for select using (status = 'active');
-- Users manage their own
create policy "links_select_own"    on public.links for select using (auth.uid() = user_id);
create policy "links_insert_own"    on public.links for insert with check (auth.uid() = user_id);
create policy "links_update_own"    on public.links for update using (auth.uid() = user_id);
create policy "links_delete_own"    on public.links for delete using (auth.uid() = user_id);
-- Admins manage all
create policy "links_select_admin"  on public.links for select
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy "links_update_admin"  on public.links for update
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy "links_delete_admin"  on public.links for delete
  using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

-- ============================================================
-- REELS POLICIES  (PUBLIC READ, AUTH WRITE)
-- ============================================================
drop policy if exists "reels_select_public" on public.reels;
drop policy if exists "reels_insert_own"    on public.reels;
drop policy if exists "reels_update_own"    on public.reels;
drop policy if exists "reels_delete_own"    on public.reels;

-- ✅ Anyone (even unauthenticated) can view all reels
create policy "reels_select_public" on public.reels for select using (true);
-- Only logged-in users can save/edit/delete their own
create policy "reels_insert_own"    on public.reels for insert with check (auth.uid() = user_id);
create policy "reels_update_own"    on public.reels for update using (auth.uid() = user_id);
create policy "reels_delete_own"    on public.reels for delete using (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE TRIGGER ON SIGNUP
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
-- DONE ✅
-- ============================================================
