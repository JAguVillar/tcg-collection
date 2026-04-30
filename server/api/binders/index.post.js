import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody(event);

  const name = (body?.name ?? "").trim();
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "Name is required" });
  }

  const description = body?.description?.trim?.() || null;
  const isActive = Boolean(body?.isActive);
  const iconPokemon =
    body?.iconPokemon != null && body.iconPokemon !== ""
      ? String(body.iconPokemon).trim() || null
      : null;
  const color = body?.color?.trim?.() || null;
  const mode = body?.mode === "custom" ? "custom" : "collection";

  const supabase = await serverSupabaseClient(event);

  if (isActive) {
    const { error: clearErr } = await supabase
      .from("binders")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);
    if (clearErr) {
      throw createError({ statusCode: 500, statusMessage: clearErr.message });
    }
  }

  const { data, error } = await supabase
    .from("binders")
    .insert({
      user_id: user.id,
      name,
      description,
      is_active: isActive,
      icon_pokemon: iconPokemon,
      color,
      mode,
    })
    .select("id, name, description, is_active, icon_pokemon, color, mode, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw createError({ statusCode: 409, statusMessage: "A binder with that name already exists" });
    }
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    isActive: data.is_active,
    iconPokemon: data.icon_pokemon,
    color: data.color,
    mode: data.mode,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    itemCount: 0,
    totalItems: 0,
    ownedItems: 0,
  };
});
