import { serverSupabaseClient, serverSupabaseServiceRole } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";
import { cardToRow } from "~~/server/utils/cards";
import { nextSortOrder } from "~~/server/utils/nextSortOrder";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const binderId = getRouterParam(event, "id");
  const body = await readBody(event);

  const card = body?.card;
  const cardId = body?.cardId ?? card?.id;
  const variant = body?.variant ?? "normal";
  const delta = Number.isFinite(body?.delta) ? Math.trunc(body.delta) : 1;
  const owned = body?.owned === true;
  const targetSlot = body?.targetSlot ?? null;

  if (!cardId) {
    throw createError({ statusCode: 400, statusMessage: "cardId or card.id required" });
  }
  if (delta <= 0) {
    throw createError({ statusCode: 400, statusMessage: "delta must be positive" });
  }

  const supabase = await serverSupabaseClient(event);
  const admin = serverSupabaseServiceRole(event);

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
  const isPokedex = binderRow.mode === "pokedex";

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

  // Pokédex slot mode: update the existing slot row in place, do not insert.
  if (isPokedex && targetSlot && Number.isInteger(targetSlot.dexNumber)) {
    let q = supabase
      .from("binder_items")
      .select("id, card_id, quantity, dex_number, form_slug, display_name, sprite_id")
      .eq("binder_id", binderId)
      .eq("dex_number", targetSlot.dexNumber);
    q = targetSlot.formSlug
      ? q.eq("form_slug", targetSlot.formSlug)
      : q.is("form_slug", null);

    const { data: slot, error: slotErr } = await q.maybeSingle();
    if (slotErr) {
      throw createError({ statusCode: 500, statusMessage: slotErr.message });
    }
    if (!slot) {
      throw createError({ statusCode: 404, statusMessage: "Slot not found" });
    }

    const { data, error } = await supabase
      .from("binder_items")
      .update({
        card_id: cardId,
        variant,
        quantity: Math.max(1, delta),
      })
      .eq("id", slot.id)
      .select("id, card_id, variant, quantity, dex_number, form_slug, display_name, sprite_id")
      .single();
    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message });
    }
    return {
      id: data.id,
      cardId: data.card_id,
      variant: data.variant,
      quantity: data.quantity,
      dexNumber: data.dex_number,
      formSlug: data.form_slug,
      displayName: data.display_name,
      spriteId: data.sprite_id,
    };
  }

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
    const sortOrder = await nextSortOrder(supabase, binderId);
    const { data, error } = await supabase
      .from("binder_items")
      .insert({
        binder_id: binderId,
        card_id: cardId,
        variant,
        quantity: initialQuantity,
        sort_order: sortOrder,
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
