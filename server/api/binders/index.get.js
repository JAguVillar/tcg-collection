import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await requireUser(event);
  const supabase = await serverSupabaseClient(event);

  const { data, error } = await supabase
    .from("binders")
    .select("id, name, description, is_default, created_at, updated_at, binder_items(count)")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  return data.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    isDefault: b.is_default,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    itemCount: b.binder_items?.[0]?.count ?? 0,
  }));
});
