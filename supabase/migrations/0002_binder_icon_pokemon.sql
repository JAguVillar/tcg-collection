-- Add optional Pokémon icon slug to binders.
-- Slug matches https://img.pokemondb.net/sprites/sword-shield/normal/<slug>.png
-- (e.g. "charizard", "mr-mime", "ho-oh", "tapu-koko"). Nullable — binders
-- without an icon fall back to the existing folder visuals.

alter table public.binders
  add column icon_pokemon text;
