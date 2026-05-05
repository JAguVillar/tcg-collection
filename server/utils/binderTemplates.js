import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Auto-discover binder templates from app/assets/binder-templates/*.json.
// Adding a new preset is just `git add` of a JSON file — no manual
// registration in API handlers or in the frontend dropdown.
//
// Template shape:
//   {
//     id: string                 // dropdown value, must be unique
//     kind: "pokedex" | "curated"
//     name, description, iconPokemon, color, mode
//     slots: [...]
//       pokedex:  { dexNumber, formSlug?, displayName, spriteId?, searchQuery? }
//       curated:  { cardId, variant? }
//   }
//
// import.meta.glob would be cleaner but it's a Vite-only feature; Nitro's
// runtime uses Rollup. Reading the directory with fs at module load is
// equivalent for our case (templates are static, loaded once at boot).
const TEMPLATES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "app",
  "assets",
  "binder-templates",
);

function loadTemplates() {
  const out = {};
  let entries;
  try {
    entries = readdirSync(TEMPLATES_DIR);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    if (name.endsWith(".raw.json")) continue;
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(TEMPLATES_DIR, name), "utf8"));
    } catch (err) {
      console.warn(`[binderTemplates] Failed to parse ${name}:`, err.message);
      continue;
    }
    if (!parsed?.id) {
      console.warn(`[binderTemplates] ${name} has no id, skipping.`);
      continue;
    }
    out[parsed.id] = parsed;
  }
  return out;
}

export const TEMPLATES = Object.freeze(loadTemplates());

// Backfill map for legacy pokedex binders created before search_query
// was persisted. Keyed by `${dexNumber}|${formSlug ?? ""}`.
export const POKEDEX_SEARCH_QUERY_BY_SLOT = (() => {
  const m = new Map();
  for (const tpl of Object.values(TEMPLATES)) {
    if (tpl.kind !== "pokedex") continue;
    for (const s of tpl.slots ?? []) {
      if (!s.searchQuery) continue;
      const key = `${s.dexNumber}|${s.formSlug ?? ""}`;
      if (!m.has(key)) m.set(key, s.searchQuery);
    }
  }
  return m;
})();

export function listPresetsSummary() {
  return Object.values(TEMPLATES).map((t) => ({
    id: t.id,
    kind: t.kind,
    mode: t.mode,
    name: t.name,
    description: t.description ?? null,
    iconPokemon: t.iconPokemon ?? null,
    color: t.color ?? null,
    slotCount: t.slots?.length ?? 0,
  }));
}
