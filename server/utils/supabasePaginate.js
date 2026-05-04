// PostgREST (Supabase) enforces a hard `db-max-rows` cap (1000 by default)
// that even Range headers cannot exceed. To fetch larger sets we have to
// paginate explicitly. Pass a builder factory so each page gets a fresh
// query — Supabase query builders can only be awaited once.
export async function fetchAllPages(buildQuery, pageSize = 1000) {
  const out = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}
