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

  if (!cardId) {
    throw createError({ statusCode: 400, statusMessage: "cardId required" });
  }
  if (!all && delta <= 0) {
    throw createError({ statusCode: 400, statusMessage: "delta must be positive" });
  }

  const supabase = await serverSupabaseClient(event);

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

  if (all || existing.quantity - delta <= 0) {
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
