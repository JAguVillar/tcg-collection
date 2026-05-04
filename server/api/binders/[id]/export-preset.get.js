import { serverSupabaseClient } from "#supabase/server";
import { requireUser } from "~~/server/utils/auth";
import { fetchAllPages } from "~~/server/utils/supabasePaginate";

// Export a custom binder as a curated-preset JSON. The user downloads
// the file, edits id/description/icon as needed, drops it under
// app/assets/binder-templates/, and commits.
export default defineEventHandler(async (event) => {
  await requireUser(event);
  const binderId = getRouterParam(event, "id");
  const supabase = await serverSupabaseClient(event);

  const { data: binder, error: binderErr } = await supabase
    .from("binders")
    .select("id, name, description, icon_pokemon, color, mode")
    .eq("id", binderId)
    .maybeSingle();

  if (binderErr) {
    throw createError({ statusCode: 500, statusMessage: binderErr.message });
  }
  if (!binder) {
    throw createError({ statusCode: 404, statusMessage: "Binder not found" });
  }
  if (binder.mode !== "custom") {
    throw createError({
      statusCode: 400,
      statusMessage: "Only custom binders can be exported as presets",
    });
  }

  let rows;
  try {
    rows = await fetchAllPages(() =>
      supabase
        .from("binder_items")
        .select("card_id, variant, created_at")
        .eq("binder_id", binderId)
        .not("card_id", "is", null)
        .order("created_at", { ascending: true }),
    );
  } catch (err) {
    throw createError({ statusCode: 500, statusMessage: err.message });
  }

  const slotKey = (r) => `${r.card_id}|${r.variant ?? "normal"}`;
  const seen = new Set();
  const slots = [];
  for (const r of rows) {
    const k = slotKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    const slot = { cardId: r.card_id };
    if (r.variant && r.variant !== "normal") slot.variant = r.variant;
    slots.push(slot);
  }

  const filename = `${slugify(binder.name) || "preset"}.json`;
  setHeader(
    event,
    "Content-Disposition",
    `attachment; filename="${filename}"`,
  );
  setHeader(event, "Content-Type", "application/json; charset=utf-8");

  return {
    id: slugify(binder.name) || "preset",
    kind: "curated",
    mode: "custom",
    name: binder.name,
    description: binder.description ?? null,
    iconPokemon:
      binder.icon_pokemon != null && binder.icon_pokemon !== ""
        ? Number(binder.icon_pokemon) || binder.icon_pokemon
        : null,
    color: binder.color ?? null,
    slots,
  };
});

function slugify(s) {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
