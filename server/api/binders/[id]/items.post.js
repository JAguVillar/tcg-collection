import { serverSupabaseClient, serverSupabaseServiceRole } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";
import { cardToRow } from "~~/server/utils/cards";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const binderId = getRouterParam(event, "id");
  const body = await readBody(event);

  const card = body?.card;
  const cardId = body?.cardId ?? card?.id;
  const variant = body?.variant ?? "normal";
  const delta = Number.isFinite(body?.delta) ? Math.trunc(body.delta) : 1;

  if (!cardId) {
    throw createError({ statusCode: 400, statusMessage: "cardId or card.id required" });
  }
  if (delta <= 0) {
    throw createError({ statusCode: 400, statusMessage: "delta must be positive" });
  }

  const supabase = await serverSupabaseClient(event);
  const admin = serverSupabaseServiceRole(event);

  // 1) Upsert the card cache (service role, bypasses RLS on writes).
  if (card) {
    const { error: cardErr } = await admin
      .from("cards")
      .upsert(cardToRow(card), { onConflict: "id" });
    if (cardErr) {
      throw createError({ statusCode: 500, statusMessage: cardErr.message });
    }
  } else {
    // No card payload: make sure the card already exists in cache.
    const { data: existing, error: existErr } = await admin
      .from("cards")
      .select("id")
      .eq("id", cardId)
      .maybeSingle();
    if (existErr) {
      throw createError({ statusCode: 500, statusMessage: existErr.message });
    }
    if (!existing) {
      throw createError({
        statusCode: 400,
        statusMessage: "Card not in cache; include `card` in request body",
      });
    }
  }

  // 2) Upsert the binder_item. If the row exists, we want to increment
  // quantity rather than overwrite — upsert can't do that atomically, so we
  // read-then-write with RLS enforcing ownership.
  const { data: existingItem, error: readErr } = await supabase
    .from("binder_items")
    .select("id, quantity")
    .eq("binder_id", binderId)
    .eq("card_id", cardId)
    .eq("variant", variant)
    .maybeSingle();

  if (readErr) {
    throw createError({ statusCode: 500, statusMessage: readErr.message });
  }

  let row;
  if (existingItem) {
    const { data, error } = await supabase
      .from("binder_items")
      .update({ quantity: existingItem.quantity + delta })
      .eq("id", existingItem.id)
      .select("id, card_id, variant, quantity")
      .single();
    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message });
    }
    row = data;
  } else {
    const { data, error } = await supabase
      .from("binder_items")
      .insert({
        binder_id: binderId,
        card_id: cardId,
        variant,
        quantity: delta,
      })
      .select("id, card_id, variant, quantity")
      .single();
    if (error) {
      // RLS violation -> user doesn't own this binder -> 404.
      if (error.code === "42501" || error.code === "PGRST301") {
        throw createError({ statusCode: 404, statusMessage: "Binder not found" });
      }
      throw createError({ statusCode: 500, statusMessage: error.message });
    }
    row = data;
  }

  return {
    id: row.id,
    cardId: row.card_id,
    variant: row.variant,
    quantity: row.quantity,
  };
});
