#!/usr/bin/env node
// Standardizes app/assets/binder-templates/pokedex-master.raw.json:
//   1. Adds `_meta.show = true` to entries that have no `show` set.
//   2. Fixes formSlug collisions: in any dex group with multiple
//      formSlug:null entries, only the canonical base (shortest
//      pokemonName by hyphen segments) keeps null; the rest receive
//      formSlug = pokemonName (unique). Entries with non-null formSlug
//      are left intact (they're either correct or hand-curated).
//   3. Appends " vmax" to searchQuery for Gmax forms (formSlug ending
//      in -gmax, _meta.formName === "gmax", or pokemonName ending in
//      -gmax). Won't double-append if "vmax" already present.
//   4. Re-sorts: dexNumber asc, formSlug nulls first, then alpha.
//
// Then derives app/assets/binder-templates/pokedex-master.json with only
// `_meta.show === true` entries and no `_meta` block — that's what the
// server reads.

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const RAW = resolve("app/assets/binder-templates/pokedex-master.raw.json");
const OUT = resolve("app/assets/binder-templates/pokedex-master.json");

const data = JSON.parse(await readFile(RAW, "utf8"));

function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// --- 1. Default show:true ---
let defaultedShow = 0;
for (const e of data) {
  if (!e._meta) e._meta = {};
  if (e._meta.show === undefined) {
    e._meta.show = true;
    defaultedShow++;
  }
}

// --- 2. Fix formSlug collisions ---
const byDex = new Map();
for (const e of data) {
  if (!byDex.has(e.dexNumber)) byDex.set(e.dexNumber, []);
  byDex.get(e.dexNumber).push(e);
}

function segmentCount(name) {
  return String(name ?? "").split("-").filter(Boolean).length;
}

// Canonical "default" form names per PokéAPI convention. Entries whose
// formName matches one of these (or is empty/null) win the base slot.
const BASE_FORM_NAMES = new Set([
  "",
  "normal",
  "default",
  "standard",
  "ordinary",
  "natural",
  "incarnate",
  "altered",
  "land",
  "shield",
  "red-striped",
  "average",
  "midday",
  "solo",
  "disguised",
  "amped",
  "single-strike",
  "full-belly",
  "family-of-four",
  "two-segment",
  "curly",
]);

function basePriority(e) {
  const fn = (e._meta?.formName ?? "").toLowerCase();
  if (fn === "" || BASE_FORM_NAMES.has(fn)) return 0;
  return 1;
}

function pickBase(nullEntries) {
  const sortable = nullEntries.map((e) => ({
    e,
    pn: e._meta?.pokemonName ?? "",
    dn: e.displayName ?? "",
    pri: basePriority(e),
  }));
  sortable.sort((a, b) => {
    if (a.pri !== b.pri) return a.pri - b.pri;
    const sa = segmentCount(a.pn || a.dn);
    const sb = segmentCount(b.pn || b.dn);
    if (sa !== sb) return sa - sb;
    if (a.pn.length !== b.pn.length) return a.pn.length - b.pn.length;
    if (a.dn.length !== b.dn.length) return a.dn.length - b.dn.length;
    return a.pn.localeCompare(b.pn);
  });
  return sortable[0].e;
}

let fixedSlugs = 0;
for (const [, group] of byDex) {
  const nullEntries = group.filter((e) => e.formSlug === null);
  if (nullEntries.length <= 1) continue;
  const base = pickBase(nullEntries);
  for (const e of nullEntries) {
    if (e === base) continue;
    const slug =
      e._meta?.pokemonName ||
      slugify(e.displayName) ||
      `dex${e.dexNumber}-x${++fixedSlugs}`;
    e.formSlug = slug;
    fixedSlugs++;
  }
}

// --- 3. Gmax → vmax searchQuery ---
let gmaxedSearch = 0;
for (const e of data) {
  const slug = e.formSlug ?? "";
  const pn = e._meta?.pokemonName ?? "";
  const fn = e._meta?.formName ?? "";
  const isGmax =
    slug.endsWith("-gmax") || pn.endsWith("-gmax") || fn === "gmax";
  if (!isGmax) continue;
  const sq = String(e.searchQuery ?? "").toLowerCase();
  if (sq.includes("vmax")) continue;
  e.searchQuery = `${sq.trim()} vmax`.trim();
  gmaxedSearch++;
}

// --- 4. Sort ---
data.sort((a, b) => {
  if (a.dexNumber !== b.dexNumber) return a.dexNumber - b.dexNumber;
  if (a.formSlug === null && b.formSlug !== null) return -1;
  if (a.formSlug !== null && b.formSlug === null) return 1;
  if (a.formSlug === null && b.formSlug === null) return 0;
  return a.formSlug.localeCompare(b.formSlug);
});

await writeFile(RAW, JSON.stringify(data, null, 2) + "\n");

// --- Derived: pokedex-master.json (clean, show:true only, no _meta) ---
const visible = data
  .filter((e) => e._meta?.show === true)
  .map(({ _meta, ...rest }) => rest);

const cleanTemplate = {
  id: "pokedex-master",
  name: "Pokédex Master",
  description:
    "Pokédex plus alternate forms (regionals, megas, GMax, Origin/Therian, etc.).",
  iconPokemon: 25,
  color: "amber",
  slots: visible,
};

await writeFile(OUT, JSON.stringify(cleanTemplate, null, 2) + "\n");

// --- Report ---
const collisionGroups = [...byDex.values()].filter(
  (g) => g.filter((e) => e.formSlug === null).length > 1,
).length;

console.log("Standardization complete.");
console.log(`  show defaulted to true:        ${defaultedShow}`);
console.log(`  formSlug entries rewritten:    ${fixedSlugs}`);
console.log(`  remaining collision groups:    ${collisionGroups}`);
console.log(`  gmax searchQueries updated:    ${gmaxedSearch}`);
console.log(`  visible slots written to json: ${visible.length}`);
console.log(`  total raw entries:             ${data.length}`);
