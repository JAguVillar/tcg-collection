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
    : "query";
  const query = body?.query?.trim?.() ?? "";
  const artist = body?.artist?.trim?.() ?? "";
  const preview = Boolean(body?.preview);
  const separateVariants = Boolean(body?.separateVariants);
  const category = body?.category === "JP" ? "JP" : "EN";

  if (mode === "query" && query.length < 2) {
    throw createError({ statusCode: 400, statusMessage: "query must be at least 2 characters" });
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
      ? { artists: [artist], separateVariants, category }
      : { query, separateVariants, category };

  const { cards, hits } = await collectAllCards(searchOverrides);

  // Dedup by (id, variant) so master-set bulk adds keep one row per variant
  // while regular bulk adds collapse to one row per card.
  const uniqueCards = [];
  const seenKeys = new Set();
  for (const card of cards) {
    if (!card?.id) continue;
    const variant = separateVariants ? (card.variant ?? "normal") : "normal";
    const key = `${card.id}|${variant}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    uniqueCards.push({ card, variant });
  }

  if (preview) {
    return {
      count: hits,
      total: hits,
      uniqueCount: uniqueCards.length,
      truncated: false,
      sample: uniqueCards.slice(0, 6).map(({ card }) => ({
        id: card.id,
        name: card.name,
        numberDisplay: card.numberDisplay,
        set: card.set,
        thumbImageUrl: card.thumbImageUrl,
      })),
    };
  }

  if (!uniqueCards.length) {
    return { inserted: 0, skipped: 0, total: hits, uniqueCount: 0, truncated: false };
  }

  const admin = serverSupabaseServiceRole(event);

  // Upsert one row per distinct card id (variants share the cards-table row).
  const cardRowsById = new Map();
  for (const { card } of uniqueCards) {
    if (!cardRowsById.has(card.id)) cardRowsById.set(card.id, cardToRow(card));
  }
  const { error: cardErr } = await admin
    .from("cards")
    .upsert(Array.from(cardRowsById.values()), { onConflict: "id" });
  if (cardErr) {
    throw createError({ statusCode: 500, statusMessage: cardErr.message });
  }

  // Find which (card_id, variant) pairs already exist so we skip them.
  const cardIds = Array.from(cardRowsById.keys());
  const variantsInBatch = Array.from(new Set(uniqueCards.map((u) => u.variant)));
  const { data: existing, error: existErr } = await supabase
    .from("binder_items")
    .select("card_id, variant")
    .eq("binder_id", binderId)
    .in("card_id", cardIds)
    .in("variant", variantsInBatch);
  if (existErr) {
    throw createError({ statusCode: 500, statusMessage: existErr.message });
  }
  const existingPairs = new Set(
    (existing ?? []).map((r) => `${r.card_id}|${r.variant}`),
  );

  const toInsert = uniqueCards
    .filter(({ card, variant }) => !existingPairs.has(`${card.id}|${variant}`))
    .map(({ card, variant }) => ({
      binder_id: binderId,
      card_id: card.id,
      variant,
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
