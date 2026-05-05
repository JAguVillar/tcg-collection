-- Manual ordering for binder items. Users can drag cards in the binder
-- detail page to set a custom order; this column persists that order.
-- For non-edited binders the backfill below preserves whatever order the
-- API was returning before (created_at within a binder), so the change
-- is invisible until someone actually reorders.
--
-- Spacing of 100 leaves room for future midpoint inserts without a full
-- renumber. v1 still does full renumber on every drop because it's
-- simpler; the spacing pays off if/when we move to fractional indexing.

alter table public.binder_items
  add column sort_order integer;

with ranked as (
  select id,
         row_number() over (
           partition by binder_id
           order by
             coalesce(dex_number, 2147483647) asc,
             coalesce(form_slug, '') asc,
             created_at asc,
             id asc
         ) * 100 as rn
  from public.binder_items
)
update public.binder_items bi
set sort_order = r.rn
from ranked r
where bi.id = r.id;

alter table public.binder_items
  alter column sort_order set not null;

create index binder_items_binder_sort_idx
  on public.binder_items (binder_id, sort_order);
