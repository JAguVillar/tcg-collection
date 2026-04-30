# Estandarizacion UI/UX - Prompt Ejecutable

## Rol
Eres un Frontend Engineer + UI/UX Specialist para Nuxt 3 + Vue 3 + Nuxt UI v4.

## Objetivo
Estandarizar UI/UX en toda la app TCG Collection, priorizando consistencia, reutilizacion y DX, sin romper funcionalidad ni identidad visual.

## Guardrails (obligatorio)
- Mantener continuidad visual (sin rediseño de marca).
- No cambiar logica de negocio ni flujos de usuario.
- No mover funcionalidades de pagina o layout.
- No agregar dependencias nuevas sin justificacion tecnica.
- No introducir abstracciones que no reduzcan duplicacion real.

## Orden de trabajo (obligatorio)
1. Composables base.
2. Primitives UI reutilizables.
3. Refactors de componentes grandes.
4. A11y + responsive.
5. Performance puntual.

## Scope tecnico
- Stack: Nuxt 3, Vue 3.5, @nuxt/ui v4, Tailwind v4, Supabase.
- Alcance: dashboard, auth, binders, detalle de binder, search y dialogs.

## Entregables por fase
- Archivos creados/modificados.
- Estandares aplicados y por que.
- Riesgos potenciales de regresion.
- Resultado de validacion funcional/a11y/responsive.

## Fase 1 - Composables
Implementar y usar progresivamente:
- `useDialogState.js`
- `useAsyncState.js`
- `useNotification.js`
- `menuItemFactories.js`

## Fase 2 - Primitives UI
Crear primitives enfocadas en reducir duplicacion:
- `BaseTile.vue`
- `CardVariantBadge.vue`
- `BinderModeBadge.vue`
- `CategorySelect.vue`
- `ArtistSelect.vue`

`BaseDialog.vue` es opcional: solo crear si reduce complejidad real en al menos 2 dialogs.

## Fase 3 - Refactors priorizados
1. `AddCardToBinderDialog.vue`
2. `BulkAddPokemonDialog.vue`
3. `CardTile.vue`
4. `BinderTile.vue`
5. `BinderPicker.vue`
6. `ExportMissingMenu.vue`

## Fase 4 - A11y + responsive
- Agregar `aria-label` en acciones icon-only.
- Validar navegacion por teclado (tab, enter, esc).
- Revisar layout en 375px, 768px y 1024px.

## Fase 5 - Performance
- Lazy load de dialogs pesados.
- Lazy load de imagenes de cartas.
- Reducir watchers y recomputos innecesarios.

## Criterios de exito medibles
- Reducir duplicacion en componentes objetivo >= 35%.
- 100% de controles icon-only criticos con `aria-label`.
- Sin regressions funcionales en login/signup, search, binders list, binder detail, add/bulk/confirm dialogs.
- Sin errores de consola en `npm run dev`.

## Verificacion final minima
1. Recorrer todas las rutas y flujos criticos.
2. Probar dialogs en desktop y mobile.
3. Confirmar feedback (toast/alert) en exito/error.
4. Verificar contraste y foco visible.
