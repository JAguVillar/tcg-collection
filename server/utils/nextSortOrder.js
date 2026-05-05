// Returns the next sort_order value to use when inserting into
// binder_items for the given binder. New rows always go to the end.
// For batch inserts, call once and add 100*i to the result.
export async function nextSortOrder(client, binderId) {
  const { data, error } = await client
    .from("binder_items")
    .select("sort_order")
    .eq("binder_id", binderId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.sort_order ?? 0) + 100;
}
