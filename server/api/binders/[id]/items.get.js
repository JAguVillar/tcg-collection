import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const binderId = getRouterParam(event, "id");
  const supabase = await serverSupabaseClient(event);

  // Confirm the binder belongs to the caller (RLS would hide it otherwise, but
  // returning a proper 404 is nicer than a silent empty list).
  const { data: binder, error: binderErr } = await supabase
    .from("binders")
    .select("id, name, description, is_default")
    .eq("id", binderId)
    .maybeSingle();

  if (binderErr) {
    throw createError({ statusCode: 500, statusMessage: binderErr.message });
  }
  if (!binder) {
    throw createError({ statusCode: 404, statusMessage: "Binder not found" });
  }

  const { data, error } = await supabase
    .from("binder_items")
    .select(`
      id, card_id, variant, quantity, notes, created_at, updated_at,
      card:cards(
        id, name, number_display, set_id, set_name, series, rarity,
        thumb_image_url, large_image_url, set_icon_url, release_date, raw
      )
    `)
    .eq("binder_id", binderId)
    .order("created_at", { ascending: true });

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  return {
    binder: {
      id: binder.id,
      name: binder.name,
      description: binder.description,
      isDefault: binder.is_default,
    },
    items: data.map((row) => ({
      id: row.id,
      cardId: row.card_id,
      variant: row.variant,
      quantity: row.quantity,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      card: row.card?.raw ?? null,
    })),
  };
});
