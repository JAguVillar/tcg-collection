-- TCG Collection Tracker — initial schema
--
-- Model:
--   cards          : shared read-only cache of pkmn.gg cards (by pkmn.gg id).
--   binders        : user-owned named containers (e.g. "Pikachus", "Favoritas").
--   binder_items   : cards inside a binder, with a variant and quantity.
--
-- A user's total collection = sum of items across all their binders. There is
-- no separate global "collection" table.

-- 1) Shared card cache
create table public.cards (
  id               text primary key,
  name             text not null,
  number_display   text,
  set_id           text,
  set_name         text,
  series           text,
  rarity           text,
  thumb_image_url  text,
  large_image_url  text,
  set_icon_url     text,
  release_date     text,
  category         text default 'EN',
  raw              jsonb,
  cached_at        timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index cards_set_idx on public.cards (set_id);

-- 2) Binders
create table public.binders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);

create index binders_user_idx on public.binders (user_id);

-- At most one default binder per user. Enables a "quick add" target.
create unique index binders_one_default_per_user
  on public.binders (user_id) where is_default;

-- 3) Binder items
create table public.binder_items (
  id          uuid primary key default gen_random_uuid(),
  binder_id   uuid not null references public.binders(id) on delete cascade,
  card_id     text not null references public.cards(id) on delete restrict,
  variant     text not null default 'normal',
  quantity    integer not null default 1 check (quantity > 0),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (binder_id, card_id, variant)
);

create index binder_items_binder_idx on public.binder_items (binder_id);
create index binder_items_card_idx   on public.binder_items (card_id);

-- 4) updated_at bumpers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

create trigger binders_set_updated_at
  before update on public.binders
  for each row execute function public.set_updated_at();

create trigger binder_items_set_updated_at
  before update on public.binder_items
  for each row execute function public.set_updated_at();

-- 5) Auto-create a default binder on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.binders (user_id, name, is_default)
  values (new.id, 'My Collection', true);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) Row Level Security

alter table public.cards         enable row level security;
alter table public.binders       enable row level security;
alter table public.binder_items  enable row level security;

-- cards: world-readable, writes only via service_role (no insert/update policy)
create policy "cards readable by all"
  on public.cards for select
  using (true);

-- binders: users see/manage only their own rows
create policy "own binders select"
  on public.binders for select
  using (auth.uid() = user_id);

create policy "own binders insert"
  on public.binders for insert
  with check (auth.uid() = user_id);

create policy "own binders update"
  on public.binders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own binders delete"
  on public.binders for delete
  using (auth.uid() = user_id);

-- binder_items: ownership is derived by joining to binders.user_id
create policy "own binder items select"
  on public.binder_items for select
  using (exists (
    select 1 from public.binders b
    where b.id = binder_items.binder_id and b.user_id = auth.uid()
  ));

create policy "own binder items insert"
  on public.binder_items for insert
  with check (exists (
    select 1 from public.binders b
    where b.id = binder_items.binder_id and b.user_id = auth.uid()
  ));

create policy "own binder items update"
  on public.binder_items for update
  using (exists (
    select 1 from public.binders b
    where b.id = binder_items.binder_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.binders b
    where b.id = binder_items.binder_id and b.user_id = auth.uid()
  ));

create policy "own binder items delete"
  on public.binder_items for delete
  using (exists (
    select 1 from public.binders b
    where b.id = binder_items.binder_id and b.user_id = auth.uid()
  ));
