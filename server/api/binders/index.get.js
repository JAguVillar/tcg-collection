import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";
import { fetchAllPages } from "~~/server/utils/supabasePaginate";

const BINDER_SELECT =
  "id, name, description, is_active, icon_pokemon, color, mode, created_at, updated_at";

function fetchBinders(supabase) {
  return supabase
    .from("binders")
    .select(BINDER_SELECT)
    .order("is_active", { ascending: false })
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
          is_active: true,
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

  // Aggregate counts via a paginated scan instead of an embedded relation —
  // PostgREST caps embedded resources at db-max-rows (1000), which truncates
  // pokedex binders (1025+ slots).
  const binderIds = data.map((b) => b.id);
  const counts = new Map(binderIds.map((id) => [id, { total: 0, owned: 0 }]));

  if (binderIds.length) {
    let rows;
    try {
      rows = await fetchAllPages(() =>
        supabase
          .from("binder_items")
          .select("binder_id, quantity")
          .in("binder_id", binderIds),
      );
    } catch (err) {
      throw createError({ statusCode: 500, statusMessage: err.message });
    }
    for (const r of rows) {
      const c = counts.get(r.binder_id);
      if (!c) continue;
      c.total += 1;
      if (r.quantity > 0) c.owned += 1;
    }
  }

  return data.map((b) => {
    const c = counts.get(b.id) ?? { total: 0, owned: 0 };
    return {
      id: b.id,
      name: b.name,
      description: b.description,
      isActive: b.is_active,
      iconPokemon: b.icon_pokemon,
      color: b.color,
      mode: b.mode,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      itemCount: c.total,
      totalItems: c.total,
      ownedItems: c.owned,
    };
  });
});
