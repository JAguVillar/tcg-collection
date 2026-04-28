#!/usr/bin/env node
/**
 * Two-phase bulk scraper for the pkmn.gg card catalog.
 *
 * Phase 1 (fetch): pull every card from pkmn.gg and dump it to
 *   data/cards-<CATEGORY>.ndjson (one raw card payload per line). This is
 *   the slow, network-bound, rate-limited phase. Resumable via a checkpoint.
 *
 * Phase 2 (load): read those NDJSON files and upsert into the Supabase
 *   `cards` table via the service role. Fast, offline, idempotent.
 *
 * Usage:
 *   node scripts/scrape-cards.mjs fetch                  # fetch EN + JP
 *   node scripts/scrape-cards.mjs fetch --category=EN
 *   node scripts/scrape-cards.mjs fetch --reset          # discard NDJSON + checkpoint
 *   node scripts/scrape-cards.mjs fetch --start-page=42  # override checkpoint
 *
 *   node scripts/scrape-cards.mjs load                   # load EN + JP NDJSONs
 *   node scripts/scrape-cards.mjs load --category=EN
 *   node scripts/scrape-cards.mjs load --file=path/to/file.ndjson
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in env (or .env at repo root)
 * for the load phase only. Fetch needs no credentials.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DATA_DIR = resolve(REPO_ROOT, "data");
const CHECKPOINT_PATH = resolve(DATA_DIR, ".fetch-checkpoint.json");

const PKMN_API_URL = "https://www.pkmn.gg/api/search/advanced";
const REQUEST_DELAY_MS = 500;
const MAX_RETRIES = 4;
const UPSERT_BATCH_SIZE = 100;

// --- env loading (no dotenv dep) ------------------------------------------

function loadDotEnv() {
  const envPath = resolve(REPO_ROOT, ".env");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// --- shared helpers --------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function ndjsonPathFor(category) {
  return resolve(DATA_DIR, `cards-${category}.ndjson`);
}

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CHECKPOINT_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveCheckpoint(state) {
  ensureDataDir();
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(state, null, 2));
}

function clearCheckpoint() {
  if (existsSync(CHECKPOINT_PATH)) rmSync(CHECKPOINT_PATH);
}

function parseCommonFlags(rest) {
  const flags = { category: "all", reset: false, startPage: null, file: null };
  for (const a of rest) {
    if (a === "--reset") flags.reset = true;
    else if (a.startsWith("--category=")) flags.category = a.slice(11);
    else if (a.startsWith("--start-page=")) flags.startPage = Number(a.slice(13));
    else if (a.startsWith("--file=")) flags.file = a.slice(7);
    else throw new Error(`Unknown flag: ${a}`);
  }
  if (!new Set(["all", "EN", "JP"]).has(flags.category)) {
    throw new Error(`--category must be one of EN, JP, all (got "${flags.category}")`);
  }
  if (flags.startPage !== null && (!Number.isFinite(flags.startPage) || flags.startPage < 1)) {
    throw new Error(`--start-page must be a positive integer`);
  }
  return flags;
}

function categoriesFor(flag) {
  return flag === "all" ? ["EN", "JP"] : [flag];
}

// === FETCH PHASE ===========================================================

function buildPayload(category, page) {
  return {
    query: "",
    cardTypes: [],
    subTypes: [],
    sets: [],
    energyTypes: [],
    rarities: [],
    weaknessTypes: [],
    resistanceTypes: [],
    retreatCosts: [],
    hitPoints: [],
    nationalPokedexNumbers: [],
    attackQuery: null,
    numberQuery: null,
    abilityQuery: null,
    evolvesFromQuery: null,
    page,
    isAscending: true,
    sortField: 5,
    artists: [],
    collectionMode: false,
    userId: "27d09d531bb7cd8eac4a6b2bd1fe0701",
    category,
    separateVariants: false,
  };
}

async function fetchPage(category, page) {
  const payload = buildPayload(category, page);
  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(PKMN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`pkmn.gg responded ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      const backoff = 2000 * 2 ** attempt;
      console.warn(
        `  ! ${category} page ${page} attempt ${attempt + 1}/${MAX_RETRIES} failed: ${err.message}. Retrying in ${backoff}ms`,
      );
      await sleep(backoff);
    }
  }
  throw new Error(
    `Failed to fetch ${category} page ${page} after ${MAX_RETRIES} attempts: ${lastError?.message}`,
  );
}

function appendCardsToNdjson(category, cards) {
  ensureDataDir();
  const path = ndjsonPathFor(category);
  const lines = cards.map((c) => JSON.stringify(c)).join("\n") + "\n";
  appendFileSync(path, lines);
}

async function fetchCategory(category, checkpoint, overrideStartPage) {
  const startPage =
    overrideStartPage ?? (checkpoint[category] ? checkpoint[category] + 1 : 1);

  let page = startPage;
  let written = 0;
  let totalHits = null;

  console.log(`\n=== fetch category=${category} starting at page ${page} ===`);

  while (true) {
    const data = await fetchPage(category, page);
    const cards = Array.isArray(data?.value) ? data.value : [];

    if (totalHits === null && Number.isFinite(Number(data?.hits))) {
      totalHits = Number(data.hits);
    }

    if (!cards.length) {
      console.log(`  ${category} page ${page}: empty response, stopping.`);
      break;
    }

    appendCardsToNdjson(category, cards);
    written += cards.length;
    checkpoint[category] = page;
    saveCheckpoint(checkpoint);

    const totalLabel = totalHits !== null ? ` / ${totalHits}` : "";
    console.log(
      `  [${category} p${page}] +${cards.length} cards (session written: ${written}${totalLabel})`,
    );

    if (totalHits !== null && written >= totalHits) {
      console.log(`  ${category}: reached hits=${totalHits}, stopping.`);
      break;
    }

    page += 1;
    await sleep(REQUEST_DELAY_MS);
  }

  return { written, totalHits, lastPage: page };
}

async function runFetch(rest) {
  const flags = parseCommonFlags(rest);

  if (flags.reset) {
    clearCheckpoint();
    for (const c of categoriesFor(flags.category)) {
      const p = ndjsonPathFor(c);
      if (existsSync(p)) rmSync(p);
    }
    console.log("Reset: cleared checkpoint and target NDJSON files.");
  }

  const checkpoint = flags.reset ? {} : loadCheckpoint();

  const summary = [];
  for (const category of categoriesFor(flags.category)) {
    const result = await fetchCategory(category, checkpoint, flags.startPage);
    summary.push({ category, ...result });
  }

  console.log("\n=== fetch done ===");
  for (const s of summary) {
    console.log(
      `  ${s.category}: ${s.written} cards written to ${ndjsonPathFor(s.category)} (hits reported: ${s.totalHits ?? "unknown"})`,
    );
  }
  console.log("\nNext step: node scripts/scrape-cards.mjs load");
}

// === LOAD PHASE ============================================================

function cardToRow(card) {
  if (!card || typeof card !== "object" || !card.id) return null;
  return {
    id: card.id,
    name: card.name ?? "Unknown",
    number_display: card.numberDisplay ?? null,
    set_id: card.setId ?? null,
    set_name: card.set ?? null,
    series: card.series ?? null,
    rarity: card.rarity ?? null,
    artist: card.artist ?? null,
    thumb_image_url: card.thumbImageUrl ?? null,
    large_image_url: card.largeImageUrl ?? null,
    set_icon_url: card.setIconUrl ?? null,
    release_date: card.releaseDate ?? null,
    category: card.category ?? "EN",
    raw: card,
  };
}

async function upsertBatch(supabase, rows) {
  const { error } = await supabase.from("cards").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
}

async function loadFile(supabase, path) {
  if (!existsSync(path)) {
    console.warn(`  skipping ${path}: file does not exist`);
    return { read: 0, upserted: 0, skipped: 0 };
  }

  const stream = createReadStream(path, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let read = 0;
  let upserted = 0;
  let skipped = 0;
  let buffer = [];

  const flush = async () => {
    if (!buffer.length) return;
    await upsertBatch(supabase, buffer);
    upserted += buffer.length;
    console.log(`  [${path}] upserted ${upserted} cards so far...`);
    buffer = [];
  };

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    read += 1;
    let card;
    try {
      card = JSON.parse(trimmed);
    } catch {
      skipped += 1;
      continue;
    }
    const row = cardToRow(card);
    if (!row) {
      skipped += 1;
      continue;
    }
    buffer.push(row);
    if (buffer.length >= UPSERT_BATCH_SIZE) await flush();
  }
  await flush();

  return { read, upserted, skipped };
}

async function runLoad(rest) {
  const flags = parseCommonFlags(rest);
  loadDotEnv();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env file).",
    );
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const targets = flags.file
    ? [flags.file]
    : categoriesFor(flags.category).map(ndjsonPathFor);

  const summary = [];
  for (const path of targets) {
    console.log(`\n=== load ${path} ===`);
    const result = await loadFile(supabase, path);
    summary.push({ path, ...result });
  }

  console.log("\n=== load done ===");
  for (const s of summary) {
    console.log(
      `  ${s.path}: read=${s.read} upserted=${s.upserted} skipped=${s.skipped}`,
    );
  }
}

// === entrypoint ============================================================

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2);
  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    console.log(
      "Usage:\n" +
        "  node scripts/scrape-cards.mjs fetch [--category=EN|JP|all] [--reset] [--start-page=N]\n" +
        "  node scripts/scrape-cards.mjs load  [--category=EN|JP|all] [--file=PATH]\n",
    );
    process.exit(subcommand ? 0 : 1);
  }

  if (subcommand === "fetch") return runFetch(rest);
  if (subcommand === "load") return runLoad(rest);

  console.error(`Unknown subcommand: ${subcommand}. Use "fetch" or "load".`);
  process.exit(1);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
