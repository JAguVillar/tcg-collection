# Binder templates

JSON definitions for the **preset** binders that show up in the
"Start from template" picker when a user creates a new binder.
Each template corresponds to `binders.mode = 'pokedex'` and produces
one slot per entry in `binder_items` (with `card_id = null` until the
user assigns a card).

## Files

| File | Purpose |
|---|---|
| `pokedex.json` | National Dex (1025 base species). Generated; do not hand-edit. |
| `pokedex-master.raw.json` | **Working copy** for the master template. Includes alternate forms with a `_meta` block (`show`, `formName`, `pokemonName`, etc.). Curate this file by hand. |
| `pokedex-master.json` | **Server-facing** clean output. Only `show: true` entries, no `_meta`. Generated from the raw file — do not hand-edit. |

## Slot shape (server-facing JSON)

```json
{
  "dexNumber": 386,
  "formSlug": "deoxys-attack",
  "displayName": "Deoxys (Attack Form)",
  "searchQuery": "deoxys",
  "spriteId": 10001
}
```

- `dexNumber` — National Dex number (1–1025).
- `formSlug` — `null` for the species' canonical base form, otherwise the
  PokéAPI pokemon slug (`charizard-mega-x`, `pikachu-gmax`, …).
  Combined with `dexNumber` it must be **unique per template** — the DB
  has a partial unique index on `(binder_id, dex_number, form_slug)`.
- `displayName` — what shows under the slot. Free text.
- `searchQuery` — what gets pre-filled in the "Add card" modal when the
  user clicks the slot. Use the TCG-searchable name (e.g. base species,
  or `"galarian darmanitan"`, `"pikachu vmax"` for GMax).
- `spriteId` — numeric ID used to fetch the placeholder sprite from
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/<id>.png`.

## Workflow — re-curating the master template

1. Edit `pokedex-master.raw.json` directly. The only thing you usually
   touch is `_meta.show`:
   - `false` to hide a form that doesn't exist in TCG (cosplay
     Pikachu, every Alcremie pattern, battle-only forms, …).
   - `true` to keep it in the binder.
2. To add a synthetic slot (e.g. one entry that represents an entire
   pattern family like Vivillon), copy an existing entry and edit
   `displayName` / `searchQuery`. `_meta` is optional on synthetic
   entries — only `show: true` matters.
3. Run the standardizer:
   ```bash
   node scripts/standardize-pokedex-master.mjs
   ```
   It will:
   - Default any missing `_meta.show` to `true`.
   - Fix `formSlug` collisions (multiple `null` per dex group → only the
     canonical base keeps `null`, the rest get unique slugs from
     `pokemonName`). Hand-customized slugs are left intact.
   - Append `" vmax"` to `searchQuery` of GMax forms.
   - Re-sort by `(dexNumber asc, formSlug nulls first, then alpha)` so
     Rayquaza comes before Mega Rayquaza.
   - Regenerate `pokedex-master.json` (filtered + clean).
4. Commit both the raw and the clean file together.

The script is idempotent — safe to run as many times as needed.

## Workflow — re-fetching from PokéAPI

Only needed if PokéAPI adds new forms or you want to start from scratch.
This **overwrites your curation** — back up `pokedex-master.raw.json`
first or merge by hand.

```bash
node scripts/fetch-pokemon-forms.mjs
```

This produces a fresh `pokedex-master.raw.json` with all ~1600 entries
and `_meta` populated but no `show` flags. Then re-curate as in the
section above.

## Adding a new template

1. Drop a `<id>.json` in this folder with the same slot shape.
2. Register it in `server/api/binders/index.post.js` (import + add to
   the `TEMPLATES` map).
3. Add a preset entry in `app/pages/binders/index.vue`
   (`TEMPLATE_PRESETS` array) so it shows in the create dialog.
