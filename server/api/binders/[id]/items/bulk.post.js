import { serverSupabaseClient, serverSupabaseServiceRole } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";
import { cardToRow } from "~~/server/utils/cards";

const PKMN_API_URL = "https://www.pkmn.gg/api/search/advanced";
const MAX_PAGES = 20;

const SEARCH_BODY = {
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
  page: 1,
  isAscending: true,
  sortField: 7,
  artists: [],
  collectionMode: false,
  userId: "27d09d531bb7cd8eac4a6b2bd1fe0701",
  category: "EN",
  separateVariants: false,
};

async function fetchAllCardsForDex(pokedexNumber) {
  const seen = new Map();
  let page = 1;
  let truncated = false;
  while (page <= MAX_PAGES) {
    const data = await $fetch(PKMN_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        ...SEARCH_BODY,
        nationalPokedexNumbers: [pokedexNumber],
        page,
      },
    });
    const results = data?.value ?? [];
    if (!results.length) break;
    for (const card of results) {
      if (card?.id && !seen.has(card.id)) seen.set(card.id, card);
    }
    page++;
    if (page > MAX_PAGES && results.length) truncated = true;
  }
  return { cards: [...seen.values()], truncated };
}

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const binderId = getRouterParam(event, "id");
  const body = await readBody(event);

  const pokedexNumber = Number(body?.pokedexNumber);
  const preview = Boolean(body?.preview);

  if (!Number.isInteger(pokedexNumber) || pokedexNumber <= 0) {
    throw createError({ statusCode: 400, statusMessage: "pokedexNumber required" });
  }

  const supabase = await serverSupabaseClient(event);

  const { data: binderRow, error: binderErr } = await supabase
    .from("binders")
    .select("id, mode")
    .eq("id", binderId)
    .maybeSingle();
  if (binderErr) {
    throw createError({ statusCode: 500, statusMessage: binderErr.message });
  }
  if (!binderRow) {
    throw createError({ statusCode: 404, statusMessage: "Binder not found" });
  }
  if (binderRow.mode !== "custom") {
    throw createError({
      statusCode: 400,
      statusMessage: "Bulk add is only available for custom binders",
    });
  }

  const { cards, truncated } = await fetchAllCardsForDex(pokedexNumber);

  if (preview) {
    return {
      count: cards.length,
      truncated,
      sample: cards.slice(0, 6).map((c) => ({
        id: c.id,
        name: c.name,
        numberDisplay: c.numberDisplay,
        set: c.set,
        thumbImageUrl: c.thumbImageUrl,
      })),
    };
  }

  if (!cards.length) {
    return { inserted: 0, skipped: 0, total: 0, truncated };
  }

  const admin = serverSupabaseServiceRole(event);

  // Upsert all cards into the cache in one round-trip.
  const cardRows = cards.map((c) => cardToRow(c));
  const { error: cardErr } = await admin
    .from("cards")
    .upsert(cardRows, { onConflict: "id" });
  if (cardErr) {
    throw createError({ statusCode: 500, statusMessage: cardErr.message });
  }

  // Find which (binder_id, card_id, variant='normal') already exist so we can
  // skip them — unique constraint would otherwise reject the whole batch.
  const cardIds = cards.map((c) => c.id);
  const { data: existing, error: existErr } = await supabase
    .from("binder_items")
    .select("card_id")
    .eq("binder_id", binderId)
    .eq("variant", "normal")
    .in("card_id", cardIds);
  if (existErr) {
    throw createError({ statusCode: 500, statusMessage: existErr.message });
  }
  const existingIds = new Set((existing ?? []).map((r) => r.card_id));

  const toInsert = cardIds
    .filter((id) => !existingIds.has(id))
    .map((id) => ({
      binder_id: binderId,
      card_id: id,
      variant: "normal",
      quantity: 0,
    }));

  let inserted = 0;
  if (toInsert.length) {
    const { error: insErr, count } = await supabase
      .from("binder_items")
      .insert(toInsert, { count: "exact" });
    if (insErr) {
      if (insErr.code === "42501" || insErr.code === "PGRST301") {
        throw createError({ statusCode: 404, statusMessage: "Binder not found" });
      }
      throw createError({ statusCode: 500, statusMessage: insErr.message });
    }
    inserted = count ?? toInsert.length;
  }

  return {
    inserted,
    skipped: cards.length - toInsert.length,
    total: cards.length,
    truncated,
  };
});
