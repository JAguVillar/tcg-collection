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
  const owned = body?.owned === true;

  if (!cardId) {
    throw createError({ statusCode: 400, statusMessage: "cardId or card.id required" });
  }
  if (delta <= 0) {
    throw createError({ statusCode: 400, statusMessage: "delta must be positive" });
  }

  const supabase = await serverSupabaseClient(event);
  const admin = serverSupabaseServiceRole(event);

  // Check binder mode so we can apply the right semantics for the item.
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
  const isCustom = binderRow.mode === "custom";

  // 1) Upsert the card cache (service role, bypasses RLS on writes).
  if (card) {
    const { error: cardErr } = await admin
      .from("cards")
      .upsert(cardToRow(card), { onConflict: "id" });
    if (cardErr) {
      throw createError({ statusCode: 500, statusMessage: cardErr.message });
    }
  } else {
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

  // 2) Upsert the binder_item.
  // - collection mode: existing row -> increment quantity; new row -> insert
  //   with quantity = delta.
  // - custom mode: each card is a single checklist slot. If it already exists
  //   we return it unchanged (no incrementing). New rows get quantity = 1 if
  //   owned was requested, else 0 (wanted-but-not-yet-owned).
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
    if (isCustom) {
      row = {
        id: existingItem.id,
        card_id: cardId,
        variant,
        quantity: existingItem.quantity,
      };
    } else {
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
    }
  } else {
    const initialQuantity = isCustom ? (owned ? 1 : 0) : delta;
    const { data, error } = await supabase
      .from("binder_items")
      .insert({
        binder_id: binderId,
        card_id: cardId,
        variant,
        quantity: initialQuantity,
      })
      .select("id, card_id, variant, quantity")
      .single();
    if (error) {
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
