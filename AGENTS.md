# Git workflow

Before making code changes for a new task or session:

1. Check the current branch.
2. If the current branch is `development`, create a new feature branch.
3. The branch name must follow this format:

   feature/YYYY-MM-DD-short-task-name

4. Use lowercase, kebab-case and no accents.
5. Work only inside that branch.
6. Do not commit unless explicitly requested.
7. Do not push unless explicitly requested.

Preferred base branch: development.

If the user asks for a new feature, refactor, bugfix, planning-to-implementation task, or starts a new session, create a new feature branch before editing files.

# UI rules

These apply to every UI change in this repo. Treat them as hard requirements, not suggestions.

1. Invoke the `nuxt-ui` and `frontend-design` skills before writing any new markup or modifying layouts. Do not skip them.
2. UI must be composed from @nuxt/ui v4 components (`UButton`, `UInput`, `UCard`, `USelectMenu`, `UModal`, `UTabs`, `UBadge`, `UProgress`, `UTooltip`, `UPopover`, `UDrawer`, `USlideover`, `UDashboardPanel`, `UTable`, etc.). When unsure whether a component exists, check the `nuxt-ui` skill — do not guess.
3. Do not write custom CSS unless strictly unavoidable (e.g. `content-visibility` for perf tricks that nuxt-ui doesn't expose). For layout, spacing, typography and colors use Tailwind utilities and nuxt-ui semantic tokens (`text-default`, `text-muted`, `bg-elevated`, `border-default`, etc.). No hardcoded hex colors.
4. Icons use the `i-lucide-*` convention.
5. Before introducing a new component, check `app/components/` for something reusable (`BinderTile`, `CardImage`, `CardMeta`, `CardTile`, `EmptyState`, `ConfirmDialog`, `AddCardToBinderDialog`, `BulkAddPokemonDialog`).
6. For non-trivial designs (anything beyond a single button or input), route through the `frontend-design` skill so the result is polished and not generic.

If you find yourself writing a `<style>` block with more than 3 lines or a custom selector, stop and rebuild with nuxt-ui components.
