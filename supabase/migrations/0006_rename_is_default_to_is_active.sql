-- Unify "default" and "active" binder concepts.
--
-- Before this migration the schema had `binders.is_default`, marking the
-- per-user binder used as the implicit "+ Add" destination. The client also
-- tracked an "active binder" purely in localStorage. Users had to learn two
-- concepts that were operationally identical.
--
-- After: there is only `is_active` — the single binder the user is currently
-- working in, persisted server-side. Setting a binder active mutates the
-- server (one active per user, enforced by the existing partial index).
-- localStorage continues to mirror it for fast first-paint.

alter table public.binders rename column is_default to is_active;

alter index public.binders_one_default_per_user
  rename to binders_one_active_per_user;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.binders (user_id, name, is_active)
  values (new.id, 'My Collection', true);
  return new;
end;
$$;
