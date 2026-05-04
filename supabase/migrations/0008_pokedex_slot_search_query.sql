-- Add the per-slot search query that the "Add card" modal pre-fills
-- when a user clicks an empty Pokédex slot. Derived from the binder
-- template at insert time; null for non-pokedex binders.
--
-- We need this column because users hand-curate searchQuery in the
-- master template (e.g. "galarian darmanitan", "dawn wings necrozma",
-- "pikachu vmax") and those edits would be lost if we re-derived from
-- displayName on the client.

alter table public.binder_items
  add column search_query text;
