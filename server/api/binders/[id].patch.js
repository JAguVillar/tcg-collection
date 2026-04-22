import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const id = getRouterParam(event, "id");
  const body = await readBody(event);

  const patch = {};
  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) {
      throw createError({ statusCode: 400, statusMessage: "Name cannot be empty" });
    }
    patch.name = name;
  }
  if (typeof body?.description === "string" || body?.description === null) {
    patch.description = body.description?.trim?.() || null;
  }
  if (typeof body?.iconPokemon === "string" || body?.iconPokemon === null) {
    patch.icon_pokemon = body.iconPokemon?.trim?.() || null;
  }

  const supabase = await serverSupabaseClient(event);

  if (body?.isDefault === true) {
    const { error: clearErr } = await supabase
      .from("binders")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true)
      .neq("id", id);
    if (clearErr) {
      throw createError({ statusCode: 500, statusMessage: clearErr.message });
    }
    patch.is_default = true;
  } else if (body?.isDefault === false) {
    patch.is_default = false;
  }

  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No updatable fields in body" });
  }

  const { data, error } = await supabase
    .from("binders")
    .update(patch)
    .eq("id", id)
    .select("id, name, description, is_default, icon_pokemon, created_at, updated_at")
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
    isDefault: data.is_default,
    iconPokemon: data.icon_pokemon,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
});
