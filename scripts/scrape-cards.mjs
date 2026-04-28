#!/usr/bin/env node
/**
 * Bulk-scrape every card from pkmn.gg into the Supabase `cards` table.
 *
 * Usage:
 *   node scripts/scrape-cards.mjs                  # scrape EN then JP
 *   node scripts/scrape-cards.mjs --category=EN    # only EN
 *   node scripts/scrape-cards.mjs --category=JP    # only JP
 *   node scripts/scrape-cards.mjs --reset          # ignore + clear checkpoint
 *   node scripts/scrape-cards.mjs --start-page=42  # override checkpoint for the run
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment (or in a
 * .env file at the repo root, which is auto-loaded).
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CHECKPOINT_PATH = resolve(__dirname, ".scrape-checkpoint.json");

const PKMN_API_URL = "https://www.pkmn.gg/api/search/advanced";

const REQUEST_DELAY_MS = 500;
const MAX_RETRIES = 4;
const UPSERT_BATCH_SIZE = 100;

// --- env loading (minimal, no dotenv dep) ---------------------------------

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

// --- CLI parsing -----------------------------------------------------------

function parseArgs(argv) {
  const args = { category: "all", reset: false, startPage: null };
  for (const a of argv.slice(2)) {
    if (a === "--reset") args.reset = true;
    else if (a.startsWith("--category=")) args.category = a.slice(11);
    else if (a.startsWith("--start-page=")) args.startPage = Number(a.slice(13));
    else throw new Error(`Unknown flag: ${a}`);
  }
  const allowed = new Set(["all", "EN", "JP"]);
  if (!allowed.has(args.category)) {
    throw new Error(`--category must be one of EN, JP, all (got "${args.category}")`);
  }
  if (args.startPage !== null && (!Number.isFinite(args.startPage) || args.startPage < 1)) {
    throw new Error(`--start-page must be a positive integer`);
  }
  return args;
}

// --- checkpoint ------------------------------------------------------------

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CHECKPOINT_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveCheckpoint(state) {
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(state, null, 2));
}

function clearCheckpoint() {
  if (existsSync(CHECKPOINT_PATH)) unlinkSync(CHECKPOINT_PATH);
}

// --- card mapping (mirrors server/utils/cards.js, no createError) ---------

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

// --- pkmn.gg fetch with retry ---------------------------------------------

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// --- supabase upsert in batches -------------------------------------------

async function upsertRows(supabase, rows) {
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await supabase
      .from("cards")
      .upsert(batch, { onConflict: "id" });
    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
  }
}

// --- per-category loop -----------------------------------------------------

async function scrapeCategory(supabase, category, checkpoint, overrideStartPage) {
  const startPage =
    overrideStartPage ?? (checkpoint[category] ? checkpoint[category] + 1 : 1);

  let page = startPage;
  let totalUpserted = 0;
  let totalHits = null;

  console.log(`\n=== Scraping category=${category} starting at page ${page} ===`);

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

    const rows = cards.map(cardToRow).filter(Boolean);
    await upsertRows(supabase, rows);

    totalUpserted += rows.length;
    checkpoint[category] = page;
    saveCheckpoint(checkpoint);

    const totalLabel = totalHits !== null ? ` / ${totalHits}` : "";
    console.log(
      `  [${category} p${page}] +${rows.length} cards (session total: ${totalUpserted}${totalLabel})`,
    );

    if (totalHits !== null && totalUpserted >= totalHits) {
      console.log(`  ${category}: reached hits=${totalHits}, stopping.`);
      break;
    }

    page += 1;
    await sleep(REQUEST_DELAY_MS);
  }

  return { totalUpserted, totalHits, lastPage: page };
}

// --- main ------------------------------------------------------------------

async function main() {
  loadDotEnv();
  const args = parseArgs(process.argv);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env file).",
    );
    process.exit(1);
  }

  if (args.reset) {
    clearCheckpoint();
    console.log("Checkpoint cleared.");
  }
  const checkpoint = args.reset ? {} : loadCheckpoint();

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const categories = args.category === "all" ? ["EN", "JP"] : [args.category];

  const summary = [];
  for (const category of categories) {
    const result = await scrapeCategory(
      supabase,
      category,
      checkpoint,
      args.startPage,
    );
    summary.push({ category, ...result });
  }

  console.log("\n=== Done ===");
  for (const s of summary) {
    console.log(
      `  ${s.category}: ${s.totalUpserted} cards upserted (hits reported: ${s.totalHits ?? "unknown"})`,
    );
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
