#!/usr/bin/env node
// Fetches every entry from PokéAPI's /pokemon-form endpoint and emits a raw
// list at app/assets/binder-templates/pokedex-master.raw.json.
//
// The raw file is meant to be hand-curated by a human into the final
// pokedex-master.json. Each entry has a `_meta` block with hints
// (isMega, isBattleOnly, versionGroup) to help decide what to keep.
//
// Curation guidelines:
//   keep: regional variants (alola/galar/hisui/paldea), megas, gmax,
//         origin/therian/primal/eternamax, canonical forms (deoxys,
//         rotom, shaymin, giratina, kyurem, etc.) that have TCG cards.
//   drop: cosplay-pikachu, totem, event-only forms with no card,
//         is_battle_only forms not represented in the TCG.
//
// After curating, save the file as pokedex-master.json with this shape:
//   {
//     "id": "pokedex-master",
//     "name": "Pokédex Master",
//     "description": "...",
//     "iconPokemon": 25,
//     "color": "amber",
//     "slots": [ { dexNumber, formSlug, displayName, searchQuery, spriteId } ]
//   }
// (drop the `_meta` field on each slot before committing).

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const OUT = resolve(
  ROOT,
  "app/assets/binder-templates/pokedex-master.raw.json",
);

const API = "https://pokeapi.co/api/v2";
const CONCURRENCY = 16;

function idFromUrl(url) {
  const m = url.match(/\/(\d+)\/?$/);
  return m ? Number(m[1]) : null;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function mapWithConcurrency(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

function titleCase(s) {
  return s
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function buildDisplayName(speciesName, formName) {
  const base = titleCase(speciesName);
  if (!formName) return base;
  return `${base} (${titleCase(formName)} Form)`;
}

console.log("Fetching pokemon-form index…");
const index = await fetchJson(`${API}/pokemon-form?limit=2000`);
console.log(`  ${index.results.length} forms total`);

console.log("Fetching each form (this takes a minute)…");
const forms = await mapWithConcurrency(index.results, CONCURRENCY, async (r) => {
  try {
    return await fetchJson(r.url);
  } catch (err) {
    console.warn(`  skip ${r.name}: ${err.message}`);
    return null;
  }
});

console.log("Fetching species info for each form…");
// Each form references a `pokemon`, which references a `species`. The
// species id is what we want as `dexNumber` (1..1025 for canonical species).
const pokemonUrls = [
  ...new Set(forms.filter(Boolean).map((f) => f.pokemon.url)),
];
const pokemonById = new Map();
await mapWithConcurrency(pokemonUrls, CONCURRENCY, async (url) => {
  try {
    const p = await fetchJson(url);
    pokemonById.set(url, p);
  } catch (err) {
    console.warn(`  skip pokemon ${url}: ${err.message}`);
  }
});

const out = [];
for (const form of forms) {
  if (!form) continue;
  const pokemon = pokemonById.get(form.pokemon.url);
  if (!pokemon) continue;
  const speciesId = idFromUrl(pokemon.species.url);
  if (!speciesId || speciesId < 1) continue;

  const formSlug = form.is_default ? null : form.name;
  const speciesName = pokemon.species.name;
  const formName = form.form_name || null;

  out.push({
    dexNumber: speciesId,
    formSlug,
    displayName: buildDisplayName(speciesName, formName),
    searchQuery: speciesName.split("-")[0],
    spriteId: pokemon.id,
    _meta: {
      isMega: Boolean(form.is_mega),
      isBattleOnly: Boolean(form.is_battle_only),
      versionGroup: form.version_group?.name ?? null,
      formName,
      pokemonName: pokemon.name,
    },
  });
}

out.sort((a, b) => {
  if (a.dexNumber !== b.dexNumber) return a.dexNumber - b.dexNumber;
  if (a.formSlug === null) return -1;
  if (b.formSlug === null) return 1;
  return a.formSlug.localeCompare(b.formSlug);
});

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${out.length} entries to ${OUT}`);
console.log("Now hand-curate this file into pokedex-master.json.");
