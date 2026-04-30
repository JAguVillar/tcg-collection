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
  if ("iconPokemon" in (body ?? {})) {
    patch.icon_pokemon =
      body.iconPokemon != null && body.iconPokemon !== ""
        ? String(body.iconPokemon).trim() || null
        : null;
  }
  if (typeof body?.color === "string" || body?.color === null) {
    patch.color = body.color?.trim?.() || null;
  }
  if (body?.mode === "custom" || body?.mode === "collection") {
    patch.mode = body.mode;
  }

  const supabase = await serverSupabaseClient(event);

  if (patch.mode) {
    const { count, error: countErr } = await supabase
      .from("binder_items")
      .select("id", { count: "exact", head: true })
      .eq("binder_id", id);
    if (countErr) {
      throw createError({ statusCode: 500, statusMessage: countErr.message });
    }
    if ((count ?? 0) > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: "Cannot change mode of a binder that already has cards",
      });
    }
  }

  if (body?.isActive === true) {
    const { error: clearErr } = await supabase
      .from("binders")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true)
      .neq("id", id);
    if (clearErr) {
      throw createError({ statusCode: 500, statusMessage: clearErr.message });
    }
    patch.is_active = true;
  } else if (body?.isActive === false) {
    patch.is_active = false;
  }

  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, statusMessage: "No updatable fields in body" });
  }

  const { data, error } = await supabase
    .from("binders")
    .update(patch)
    .eq("id", id)
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
  };
});
