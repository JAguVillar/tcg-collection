import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";

const BINDER_SELECT =
  "id, name, description, is_default, icon_pokemon, color, mode, created_at, updated_at, binder_items(quantity)";

function fetchBinders(supabase) {
  return supabase
    .from("binders")
    .select(BINDER_SELECT)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const supabase = await serverSupabaseClient(event);

  let { data, error } = await fetchBinders(supabase);

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  if (!data.length) {
    const { error: upsertError } = await supabase
      .from("binders")
      .upsert(
        {
          user_id: user.id,
          name: "My Collection",
          is_default: true,
          mode: "collection",
        },
        { onConflict: "user_id,name", ignoreDuplicates: true },
      );
    if (upsertError) {
      throw createError({
        statusCode: 500,
        statusMessage: upsertError.message,
      });
    }
    ({ data, error } = await fetchBinders(supabase));
    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message });
    }
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
      color: b.color,
      mode: b.mode,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      itemCount: totalItems,
      totalItems,
      ownedItems,
    };
  });
});
