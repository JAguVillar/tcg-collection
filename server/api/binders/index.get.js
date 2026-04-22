import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const supabase = await serverSupabaseClient(event);

  const { data, error } = await supabase
    .from("binders")
    .select(
      "id, name, description, is_default, icon_pokemon, mode, created_at, updated_at, binder_items(quantity)",
    )
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  return data.map((b) => {
    const rows = b.binder_items ?? [];
    const totalItems = rows.length;
    const ownedItems = rows.reduce((n, r) => n + (r.quantity > 0 ? 1 : 0), 0);
    return {
      id: b.id,
      name: b.name,
      description: b.description,
      isDefault: b.is_default,
      iconPokemon: b.icon_pokemon,
      mode: b.mode,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      itemCount: totalItems,
      totalItems,
      ownedItems,
    };
  });
});
