import { serverSupabaseClient, serverSupabaseServiceRole } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";
import { cardToRow } from "~~/server/utils/cards";
import { collectAllCards } from "~~/server/utils/pkmnSearch";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const binderId = getRouterParam(event, "id");
  const body = await readBody(event);

  const mode = body?.mode === "artist" || (!body?.mode && body?.artist)
    ? "artist"
    : "pokemon";
  const pokedexNumber = Number(body?.pokedexNumber);
  const artist = body?.artist?.trim?.() ?? "";
  const preview = Boolean(body?.preview);

  if (mode === "pokemon" && (!Number.isInteger(pokedexNumber) || pokedexNumber <= 0)) {
    throw createError({ statusCode: 400, statusMessage: "pokedexNumber required" });
  }
  if (mode === "artist" && !artist) {
    throw createError({ statusCode: 400, statusMessage: "artist required" });
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

  const searchOverrides =
    mode === "artist"
      ? { artists: [artist], separateVariants: false }
      : { nationalPokedexNumbers: [pokedexNumber], separateVariants: false };

  const { cards, hits } = await collectAllCards(searchOverrides);

  const uniqueCards = [];
  const uniqueById = new Set();
  for (const card of cards) {
    if (!card?.id || uniqueById.has(card.id)) continue;
    uniqueById.add(card.id);
    uniqueCards.push(card);
  }

  if (preview) {
    return {
      count: hits,
      total: hits,
      uniqueCount: uniqueCards.length,
      truncated: false,
      sample: uniqueCards.slice(0, 6).map((c) => ({
        id: c.id,
        name: c.name,
        numberDisplay: c.numberDisplay,
        set: c.set,
        thumbImageUrl: c.thumbImageUrl,
      })),
    };
  }

  if (!uniqueCards.length) {
    return { inserted: 0, skipped: 0, total: hits, uniqueCount: 0, truncated: false };
  }

  const admin = serverSupabaseServiceRole(event);

  // Upsert all cards into the cache in one round-trip.
  const cardRows = uniqueCards.map((c) => cardToRow(c));
  const { error: cardErr } = await admin
    .from("cards")
    .upsert(cardRows, { onConflict: "id" });
  if (cardErr) {
    throw createError({ statusCode: 500, statusMessage: cardErr.message });
  }

  // Find which (binder_id, card_id, variant='normal') already exist so we can
  // skip them — unique constraint would otherwise reject the whole batch.
  const cardIds = uniqueCards.map((c) => c.id);
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
    skipped: uniqueCards.length - toInsert.length,
    total: hits,
    uniqueCount: uniqueCards.length,
    truncated: false,
  };
});
