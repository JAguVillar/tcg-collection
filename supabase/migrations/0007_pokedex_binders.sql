-- Add "pokedex" binder mode: a per-pokémon slot binder.
--
-- A pokedex binder represents the National Dex (and optionally alternate
-- forms). Each slot is a (dex_number, form_slug) pair. The user clicks a
-- slot to assign a TCG card from the search modal; until then the slot
-- has card_id = null.
--
-- Schema changes:
--   binders.mode now allows 'pokedex'.
--   binder_items.card_id becomes nullable (slot rows can be empty).
--   binder_items gains dex_number, form_slug, display_name, sprite_id.
--   New unique partial index ensures one slot per (binder, dex, form).
--   New check ensures every row references at least a card or a slot.
alter table public.binders
  drop constraint if exists binders_mode_check;

alter table public.binders
  add constraint binders_mode_check
    check (mode in ('collection', 'custom', 'pokedex'));

alter table public.binder_items
  alter column card_id drop not null;

alter table public.binder_items
  add column dex_number   integer,
  add column form_slug    text,
  add column display_name text,
  add column sprite_id    integer;

create unique index binder_items_one_slot_per_dex
  on public.binder_items (binder_id, dex_number, form_slug)
  where dex_number is not null;

alter table public.binder_items
  drop constraint if exists binder_items_card_or_slot_check;

alter table public.binder_items
  add constraint binder_items_card_or_slot_check
    check (card_id is not null or dex_number is not null);
