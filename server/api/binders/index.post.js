import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";
import { TEMPLATES } from "~~/server/utils/binderTemplates";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody(event);

  const templateId = body?.template ? String(body.template) : null;
  if (templateId && !TEMPLATES[templateId]) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown template: ${templateId}`,
    });
  }
  const templateData = templateId ? TEMPLATES[templateId] : null;

  if (templateData && !templateData.slots?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: `Template "${templateId}" has no slots yet`,
    });
  }

  const name = (body?.name ?? templateData?.name ?? "").trim();
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "Name is required" });
  }

  const description =
    body?.description?.trim?.() || templateData?.description || null;
  const isActive = Boolean(body?.isActive);
  const iconPokemon =
    body?.iconPokemon != null && body.iconPokemon !== ""
      ? String(body.iconPokemon).trim() || null
      : templateData?.iconPokemon != null
        ? String(templateData.iconPokemon)
        : null;
  const color = body?.color?.trim?.() || templateData?.color || null;

  // Template provides authoritative mode (pokedex|custom). For non-template
  // creates, fall back to the body or "collection".
  const mode = templateData
    ? (templateData.mode ?? "pokedex")
    : body?.mode === "custom"
      ? "custom"
      : "collection";

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
    .select(
      "id, name, description, is_active, icon_pokemon, color, mode, created_at, updated_at",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      throw createError({
        statusCode: 409,
        statusMessage: "A binder with that name already exists",
      });
    }
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  let totalItems = 0;

  if (templateData?.slots?.length) {
    const rows = await buildTemplateRows(supabase, templateData, data.id);
    if (rows.length) {
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error: insertErr } = await supabase
          .from("binder_items")
          .insert(rows.slice(i, i + CHUNK));
        if (insertErr) {
          await supabase.from("binders").delete().eq("id", data.id);
          throw createError({
            statusCode: 500,
            statusMessage: insertErr.message,
          });
        }
      }
      totalItems = rows.length;
    }
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
    totalItems,
    ownedItems: 0,
  };
});

async function buildTemplateRows(supabase, template, binderId) {
  if (template.kind === "pokedex") {
    return template.slots.map((s) => ({
      binder_id: binderId,
      card_id: null,
      variant: "normal",
      quantity: 0,
      dex_number: s.dexNumber,
      form_slug: s.formSlug ?? null,
      display_name: s.displayName,
      sprite_id: s.spriteId ?? s.dexNumber,
      search_query: s.searchQuery ?? null,
    }));
  }

  if (template.kind === "curated") {
    // Skip slots whose card no longer exists in the cards cache so we don't
    // FK-violate. The user can update the JSON on next deploy.
    const cardIds = Array.from(
      new Set(template.slots.map((s) => s.cardId).filter(Boolean)),
    );
    if (!cardIds.length) return [];
    const { data: existing, error } = await supabase
      .from("cards")
      .select("id")
      .in("id", cardIds);
    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message });
    }
    const known = new Set((existing ?? []).map((c) => c.id));
    return template.slots
      .filter((s) => s.cardId && known.has(s.cardId))
      .map((s) => ({
        binder_id: binderId,
        card_id: s.cardId,
        variant: s.variant ?? "normal",
        quantity: 0,
      }));
  }

  throw createError({
    statusCode: 500,
    statusMessage: `Unsupported template kind: ${template.kind}`,
  });
}
