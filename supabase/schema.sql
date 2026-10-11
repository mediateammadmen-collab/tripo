-- Tripo database setup. Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One travel profile per account (answers from the travel-style questions, language, friends).
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Saved places, flights and hotels.
create table if not exists public.saved_items (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists saved_items_user_idx on public.saved_items (user_id);

-- Trips. The whole trip (name, dates, days, stops, receipts) lives in "data".
create table if not exists public.trips (
  id         text primary key,
  owner      uuid not null references auth.users (id) on delete cascade,
  data       jsonb not null,
  share_id   text unique,                       -- random id used in share links
  share_mode text not null default 'off' check (share_mode in ('off', 'view', 'edit')),
  updated_at timestamptz not null default now()
);
create index if not exists trips_owner_idx on public.trips (owner);

-- People who joined a shared trip to plan together.
create table if not exists public.trip_members (
  trip_id   text not null references public.trips (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  name      text not null default '',
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index if not exists trip_members_user_idx on public.trip_members (user_id);

-- Conversations with Tripo.
create table if not exists public.chats (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default '',
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists chats_user_idx on public.chats (user_id, updated_at desc);

-- Looked-up places (location, photo, description), shared by everyone to keep the app fast.
-- Only the server reads and writes this table.
create table if not exists public.place_cache (
  key        text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper functions (used by the security rules below)
-- ---------------------------------------------------------------------------

create or replace function public.is_trip_owner(t text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = t and owner = auth.uid());
$$;

create or replace function public.is_trip_member(t text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = auth.uid());
$$;

create or replace function public.trip_is_editable(t text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = t and share_mode = 'edit');
$$;

-- Join a trip from an invite link. Works only while the owner has "plan together" switched on.
create or replace function public.join_trip(p_share_id text, p_name text default '')
returns text language plpgsql security definer set search_path = public as $$
declare
  v_trip text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select id into v_trip from public.trips where share_id = p_share_id and share_mode = 'edit';
  if v_trip is null then
    raise exception 'invite not found';
  end if;
  insert into public.trip_members (trip_id, user_id, name)
  values (v_trip, auth.uid(), left(coalesce(p_name, ''), 60))
  on conflict (trip_id, user_id) do update set name = excluded.name;
  return v_trip;
end;
$$;

revoke all on function public.join_trip(text, text) from public, anon;
grant execute on function public.join_trip(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Security rules: everyone can only reach their own data (plus trips shared with them)
-- ---------------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.saved_items  enable row level security;
alter table public.trips        enable row level security;
alter table public.trip_members enable row level security;
alter table public.chats        enable row level security;
alter table public.place_cache  enable row level security;   -- no rules = server only

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own saved items" on public.saved_items;
create policy "own saved items" on public.saved_items
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own chats" on public.chats;
create policy "own chats" on public.chats
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "read own or joined trips" on public.trips;
create policy "read own or joined trips" on public.trips
  for select to authenticated using (owner = auth.uid() or public.is_trip_member(id));

drop policy if exists "create own trips" on public.trips;
create policy "create own trips" on public.trips
  for insert to authenticated with check (owner = auth.uid());

drop policy if exists "owner updates trip" on public.trips;
create policy "owner updates trip" on public.trips
  for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

drop policy if exists "members edit shared trip" on public.trips;
create policy "members edit shared trip" on public.trips
  for update to authenticated
  using (share_mode = 'edit' and public.is_trip_member(id))
  with check (share_mode = 'edit' and public.is_trip_member(id));

drop policy if exists "owner deletes trip" on public.trips;
create policy "owner deletes trip" on public.trips
  for delete to authenticated using (owner = auth.uid());

drop policy if exists "see members of my trips" on public.trip_members;
create policy "see members of my trips" on public.trip_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_trip_owner(trip_id) or public.is_trip_member(trip_id));

drop policy if exists "leave or remove members" on public.trip_members;
create policy "leave or remove members" on public.trip_members
  for delete to authenticated using (user_id = auth.uid() or public.is_trip_owner(trip_id));

-- Members may change a trip's contents but not who owns it or how it is shared.
create or replace function public.protect_trip_sharing()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and auth.uid() <> old.owner then
    new.owner := old.owner;
    new.share_id := old.share_id;
    new.share_mode := old.share_mode;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_trip_sharing on public.trips;
create trigger protect_trip_sharing before update on public.trips
  for each row execute function public.protect_trip_sharing();
