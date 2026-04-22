import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";

// Toggle the owned/missing state of a checklist item in a custom binder.
// Body: { cardId, variant?, owned: boolean }
// Setting owned=true  -> quantity = 1 (have it)
// Setting owned=false -> quantity = 0 (still missing)
//
// This endpoint only makes sense for custom binders. Collection binders should
// use POST/DELETE to manage quantities.

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const binderId = getRouterParam(event, "id");
  const body = await readBody(event);

  const cardId = body?.cardId;
  const variant = body?.variant ?? "normal";
  const owned = body?.owned;

  if (!cardId) {
    throw createError({ statusCode: 400, statusMessage: "cardId required" });
  }
  if (typeof owned !== "boolean") {
    throw createError({ statusCode: 400, statusMessage: "owned (boolean) required" });
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
      statusMessage: "This endpoint is only for custom binders",
    });
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

  const nextQuantity = owned ? 1 : 0;
  const { data, error } = await supabase
    .from("binder_items")
    .update({ quantity: nextQuantity })
    .eq("id", existing.id)
    .select("id, card_id, variant, quantity")
    .single();

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  return {
    id: data.id,
    cardId: data.card_id,
    variant: data.variant,
    quantity: data.quantity,
  };
});
