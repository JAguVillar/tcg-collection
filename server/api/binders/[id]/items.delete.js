import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const binderId = getRouterParam(event, "id");
  const body = await readBody(event);

  const cardId = body?.cardId;
  const variant = body?.variant ?? "normal";
  const all = Boolean(body?.all);
  const delta = Number.isFinite(body?.delta) ? Math.trunc(body.delta) : 1;
  const targetSlot = body?.targetSlot ?? null;

  if (!cardId && !targetSlot) {
    throw createError({ statusCode: 400, statusMessage: "cardId or targetSlot required" });
  }
  if (!all && delta <= 0) {
    throw createError({ statusCode: 400, statusMessage: "delta must be positive" });
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
  const isCustom = binderRow.mode === "custom";
  const isPokedex = binderRow.mode === "pokedex";

  // Pokédex slot mode: clear the assigned card from the slot but keep
  // the slot row so the user can fill it again later.
  if (isPokedex && targetSlot && Number.isInteger(targetSlot.dexNumber)) {
    let q = supabase
      .from("binder_items")
      .select("id")
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
    const { error } = await supabase
      .from("binder_items")
      .update({ card_id: null, quantity: 0, variant: "normal" })
      .eq("id", slot.id);
    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message });
    }
    return { id: slot.id, quantity: 0, removed: true };
  }

  const { data: existing, error: readErr } = await supabase
    .from("binder_items")
    .select("id, quantity")
    .eq("binder_id", binderId)
    .eq("card_id", cardId)
    .eq("variant", variant)
    .maybeSingle();

  if (readErr) {
    throw createError({ statusCode: 500, statusMessage: readErr.message });
  }
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Item not found" });
  }

  // In custom binders a DELETE always removes the item from the checklist
  // regardless of quantity; collection binders keep the legacy decrement flow.
  if (isCustom || all || existing.quantity - delta <= 0) {
    const { error } = await supabase.from("binder_items").delete().eq("id", existing.id);
    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message });
    }
    return { id: existing.id, quantity: 0, removed: true };
  }

  const { data, error } = await supabase
    .from("binder_items")
    .update({ quantity: existing.quantity - delta })
    .eq("id", existing.id)
    .select("id, quantity")
    .single();

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  return { id: data.id, quantity: data.quantity, removed: false };
});
