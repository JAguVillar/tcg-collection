-- Add explicit artist metadata to cached cards.
alter table public.cards
  add column if not exists artist text;

-- Backfill from existing raw payloads when possible.
update public.cards
set artist = raw->>'artist'
where artist is null
  and raw ? 'artist';

create index if not exists cards_artist_idx on public.cards (artist);
