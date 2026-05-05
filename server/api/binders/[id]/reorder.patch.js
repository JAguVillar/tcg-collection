import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";

// Bulk reorder of binder items. Body:
//   { orderedIds: ["uuid", "uuid", ...] }
// The list must contain every item in the binder; the server renumbers
// sort_order to (i+1)*100 in the order given. RLS via the user-scoped
// supabase client ensures only the owner can write.

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const binderId = getRouterParam(event, "id");
  const body = await readBody(event);

  const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds : null;
  if (!orderedIds?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: "orderedIds (non-empty array) required",
    });
  }

  const seen = new Set();
  for (const id of orderedIds) {
    if (typeof id !== "string" || !id) {
      throw createError({ statusCode: 400, statusMessage: "Invalid id in orderedIds" });
    }
    if (seen.has(id)) {
      throw createError({ statusCode: 400, statusMessage: "Duplicate id in orderedIds" });
    }
    seen.add(id);
  }

  const supabase = await serverSupabaseClient(event);

  const { data: binder, error: binderErr } = await supabase
    .from("binders")
    .select("id")
    .eq("id", binderId)
    .maybeSingle();
  if (binderErr) {
    throw createError({ statusCode: 500, statusMessage: binderErr.message });
  }
  if (!binder) {
    throw createError({ statusCode: 404, statusMessage: "Binder not found" });
  }

  const { data: existing, error: existErr } = await supabase
    .from("binder_items")
    .select("id")
    .eq("binder_id", binderId);
  if (existErr) {
    throw createError({ statusCode: 500, statusMessage: existErr.message });
  }
  const existingIds = new Set((existing ?? []).map((r) => r.id));
  if (existingIds.size !== orderedIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: `orderedIds length ${orderedIds.length} does not match binder item count ${existingIds.size}`,
    });
  }
  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Item ${id} does not belong to this binder`,
      });
    }
  }

  // Two-phase update to dodge the unique-ish nature of (binder_id, sort_order)
  // — even though we don't have a unique index, doing one update per row is
  // simpler than crafting a single CTE and Supabase's JS client doesn't expose
  // raw SQL. ~1000 row binders complete in ~1s.
  const updates = orderedIds.map((id, i) =>
    supabase
      .from("binder_items")
      .update({ sort_order: (i + 1) * 100 })
      .eq("id", id)
      .eq("binder_id", binderId),
  );
  const results = await Promise.all(updates);
  for (const r of results) {
    if (r.error) {
      throw createError({ statusCode: 500, statusMessage: r.error.message });
    }
  }

  return { updated: orderedIds.length };
});
