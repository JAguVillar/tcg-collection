-- Add "custom" binder mode: a checklist-style binder where the user defines
-- a list of cards they want to collect and marks each one as owned or missing.
--
-- In collection mode (default, pre-existing behavior):
--   binder_items.quantity >= 1 (a card is only in the binder if the user owns it).
-- In custom mode:
--   binder_items.quantity is 0 (missing) or >= 1 (owned). A card with quantity 0
--   represents a wanted-but-not-yet-owned card. Each card is a single slot; we
--   do not track multiple target copies.

alter table public.binders
  add column mode text not null default 'collection'
    check (mode in ('collection', 'custom'));

-- Relax the quantity > 0 constraint so custom binders can hold wanted cards
-- with quantity = 0. The API layer enforces "quantity >= 1" for collection
-- binders.
alter table public.binder_items
  drop constraint binder_items_quantity_check;

alter table public.binder_items
  add constraint binder_items_quantity_check check (quantity >= 0);
