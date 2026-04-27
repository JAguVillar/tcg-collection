-- Add optional accent color to binders. Stores a Nuxt UI semantic color name
-- registered in app.config.ts (e.g. "pink", "rose", "indigo"). Nullable —
-- binders without a color fall back to "primary" in the UI.

alter table public.binders
  add column color text;
