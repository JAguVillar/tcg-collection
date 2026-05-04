#!/usr/bin/env node
// Generates app/assets/binder-templates/pokedex.json from pokemon-compact.json.
// Run once and commit the output. Re-run if pokemon-compact.json changes.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

const SRC = resolve(ROOT, "app/assets/pokemon-compact.json");
const OUT = resolve(ROOT, "app/assets/binder-templates/pokedex.json");

function slugToLabel(slug) {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

const raw = JSON.parse(await readFile(SRC, "utf8"));

const slots = raw
  .filter((p) => Number.isInteger(p.id) && p.id >= 1 && p.id <= 1025)
  .sort((a, b) => a.id - b.id)
  .map((p) => ({
    dexNumber: p.id,
    formSlug: null,
    displayName: slugToLabel(p.name),
    searchQuery: p.name.split("-")[0],
    spriteId: p.id,
  }));

const template = {
  id: "pokedex",
  name: "Pokédex",
  description: "One slot for each of the 1025 Pokémon in the National Dex.",
  iconPokemon: 25,
  color: "red",
  slots,
};

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(template, null, 2) + "\n");

console.log(`Wrote ${slots.length} slots to ${OUT}`);
