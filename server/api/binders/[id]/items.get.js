import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";
import { fetchAllPages } from "~~/server/utils/supabasePaginate";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const binderId = getRouterParam(event, "id");
  const supabase = await serverSupabaseClient(event);

  // Confirm the binder belongs to the caller (RLS would hide it otherwise, but
  // returning a proper 404 is nicer than a silent empty list).
  const { data: binder, error: binderErr } = await supabase
    .from("binders")
    .select("id, name, description, is_active, icon_pokemon, mode")
    .eq("id", binderId)
    .maybeSingle();

  if (binderErr) {
    throw createError({ statusCode: 500, statusMessage: binderErr.message });
  }
  if (!binder) {
    throw createError({ statusCode: 404, statusMessage: "Binder not found" });
  }

  let data;
  try {
    data = await fetchAllPages(() =>
      supabase
        .from("binder_items")
        .select(`
          id, card_id, variant, quantity, notes, created_at, updated_at,
          dex_number, form_slug, display_name, sprite_id, search_query,
          card:cards(
            id, name, number_display, set_id, set_name, series, rarity, artist,
            category, thumb_image_url, large_image_url, set_icon_url, release_date, raw
          )
        `)
        .eq("binder_id", binderId)
        .order("dex_number", { ascending: true, nullsFirst: false })
        .order("form_slug", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: true }),
    );
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  return {
    binder: {
      id: binder.id,
      name: binder.name,
      description: binder.description,
      isActive: binder.is_active,
      iconPokemon: binder.icon_pokemon,
      mode: binder.mode,
    },
    items: data.map((row) => ({
      id: row.id,
      cardId: row.card_id,
      variant: row.variant,
      quantity: row.quantity,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      dexNumber: row.dex_number,
      formSlug: row.form_slug,
      displayName: row.display_name,
      spriteId: row.sprite_id,
      searchQuery: row.search_query,
      card: row.card?.raw
        ? {
            ...row.card.raw,
            artist: row.card.artist ?? row.card.raw.artist ?? null,
            category: row.card.category ?? row.card.raw.category ?? "EN",
          }
        : null,
    })),
  };
});
