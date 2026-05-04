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
const modules = import.meta.glob(
  "../../app/assets/binder-templates/*.json",
  { eager: true, import: "default" },
);

export const TEMPLATES = Object.freeze(
  Object.fromEntries(
    Object.values(modules)
      .filter((t) => t && typeof t === "object" && t.id)
      .map((t) => [t.id, t]),
  ),
);

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
