# Nuxt Collection - Contexto para Claude Code

## Que es este proyecto
Aplicacion Nuxt 4 para buscar cartas de Pokemon usando un endpoint interno que proxea a `pkmn.gg`, con:
- busqueda por texto
- orden por campos
- paginacion
- opcion `separateVariants` para separar variantes por precio/tipo
- **tracker de colecciones por usuario** via "binders" nombrados, persistido en Supabase

## Stack
- Nuxt `4.4.2`
- Vue `3.5.x`
- Nuxt UI `4.6.x`
- Tailwind CSS `4.x`
- Supabase (`@nuxtjs/supabase` + `@supabase/supabase-js`) para auth y DB

## Archivos clave
- `app/pages/index.vue` -> UI de busqueda + boton "+" para añadir al binder activo.
- `app/pages/binders/index.vue` -> listado/crear/borrar binders.
- `app/pages/binders/[id].vue` -> contenido de un binder.
- `app/pages/login.vue` -> signIn/signUp.
- `app/components/AuthButton.vue`, `app/components/BinderPicker.vue`.
- `app/composables/useCardSearch.js` -> estado y logica de busqueda/paginacion/sort.
- `app/composables/useBinders.js` -> listado/CRUD de binders y "binder activo".
- `app/composables/useBinder.js` -> contenido de un binder + add/remove.
- `app/middleware/auth.js` -> route middleware para rutas protegidas.
- `server/api/cards/search.post.js` -> endpoint proxy de pkmn.gg (no tocado).
- `server/api/binders/**` -> CRUD de binders y items (auth via Supabase).
- `server/utils/auth.js`, `server/utils/cards.js` -> helpers server.
- `supabase/migrations/0001_init_collection.sql` -> schema + RLS + trigger signup.
- `nuxt.config.ts` -> configuracion Nuxt + modulos `@nuxt/ui` y `@nuxtjs/supabase`.

---

## Modelo de datos (Supabase)

Tablas:
- **`cards`**: cache compartida de cartas de pkmn.gg (PK = `id` de pkmn.gg, ej. `"ex3-8"`). Guardamos los campos usados por la UI + el `raw` completo en `jsonb`. World-readable; writes solo via `service_role`.
- **`binders`**: `(id, user_id, name, description, is_default)`. Un usuario puede tener varios binders nombrados. `unique(user_id, name)`. Indice parcial unico sobre `is_default` para garantizar como mucho un default por usuario.
- **`binder_items`**: `(id, binder_id, card_id, variant, quantity, notes)`. `unique(binder_id, card_id, variant)` -> cada (carta, variante) aparece una sola vez por binder; cantidades crecen con +1.

Reglas:
- La coleccion total de un usuario = suma de sus `binder_items` a traves de todos sus binders.
- No hay tabla "global collection" separada.
- Una misma carta puede estar en varios binders distintos si el usuario asi lo quiere.
- Trigger `on_auth_user_created` crea un binder `"My Collection"` con `is_default=true` al registrarse un usuario.

RLS:
- `cards`: select publico, writes restringidos a service role.
- `binders`: el usuario solo ve/modifica los suyos (`auth.uid() = user_id`).
- `binder_items`: ownership derivado via join a `binders.user_id`.

---

## Endpoints internos

### 1) Busqueda (sin cambios)
**POST** `/api/cards/search` -> proxy a `https://www.pkmn.gg/api/search/advanced`.

### 2) Binders
Todas requieren sesion de Supabase; tiran 401 si no hay usuario.

- **GET `/api/binders`** -> `[{ id, name, description, isDefault, itemCount, createdAt, updatedAt }, ...]` ordenado por `isDefault desc, createdAt asc`.
- **POST `/api/binders`** -> body `{ name, description?, isDefault? }`. Si `isDefault` se desmarca cualquier default previo. 409 si el nombre ya existe para ese usuario.
- **PATCH `/api/binders/:id`** -> body `{ name?, description?, isDefault? }`. Mismo manejo de default que POST.
- **DELETE `/api/binders/:id`** -> cascade borra sus items. Devuelve `{ ok: true }`.

### 3) Items dentro de un binder
- **GET `/api/binders/:id/items`** -> `{ binder, items: [{ id, cardId, variant, quantity, card }] }`. `card` es el `raw` completo del cache (compatible con el render actual). 404 si el binder no existe o no es del usuario.
- **POST `/api/binders/:id/items`** -> body `{ cardId, variant?, card?, delta? }`. Sube en 1 (o `delta`) la cantidad. Si la carta no estaba en la cache, debe pasarse `card` completa (como viene de `/api/cards/search`) para upsert en `cards` (service role).
- **DELETE `/api/binders/:id/items`** -> body `{ cardId, variant?, delta?, all? }`. Decrementa; si `quantity <= 0` o `all=true`, borra la fila. Devuelve `{ id, quantity, removed }`.

---

## Flujo UI

1. **Sin login**: se puede buscar cartas (endpoint publico de pkmn.gg), pero no aparecen los botones de "añadir a binder".
2. **Login** (`/login`): email + password. Al registrarse se crea el binder `"My Collection"` por trigger.
3. **Binder activo**: selector en el header de `/`. Persistido en `localStorage` (`tcg-active-binder-id`). Fallback: el binder con `is_default=true`, o el primero disponible.
4. **Añadir carta desde resultados**: boton primario "+ <nombre del binder activo>" (quick-add) + boton `folder-plus` que abre un `BinderPicker` para mandar a otro binder.
5. **`/binders`**: lista/crea/borra binders, marcar como activo o default.
6. **`/binders/:id`**: render de las cartas del binder (reusa el grid de `index.vue`), con +/- y "remove all".

---

## Variables de entorno

`.env.example` incluye:
- `SUPABASE_URL`
- `SUPABASE_KEY` (anon)
- `SUPABASE_SERVICE_KEY` (solo server; consumida por `serverSupabaseServiceRole` del modulo `@nuxtjs/supabase`)

---

## Endpoint externo (pkmn.gg)

**POST** `https://www.pkmn.gg/api/search/advanced`

El endpoint interno `/api/cards/search` actua como proxy y devuelve la respuesta upstream casi sin transformacion.

### Sort fields (mapping numerico)
- `7` = Best Match
- `0` = Number
- `1` = Name
- `2` = Rarity
- `3` = Price
- `4` = Artist
- `5` = Released

Regla UI:
- Si clickeas el mismo campo y soporta direccion, toggle de `isAscending`.
- Si cambias de campo, `isAscending` vuelve a `true`.

---

## Contrato de datos `Card` (observado)

Ejemplo real recibido:

```json
{
  "id": "ex3-8",
  "name": "Plusle",
  "number": "8",
  "rarity": "Rare Holo",
  "formattedPrice": "$86.20",
  "sortPrice": "000086.20",
  "setId": "ex3",
  "set": "dragon",
  "series": "ex",
  "artist": "Atsuko Nishida",
  "category": "EN",
  "primaryVariant": "holofoil",
  "variantMap": {
    "holofoil": {
      "price": 86.2,
      "priceDisplay": "$86.20",
      "type": "Primary",
      "key": "holofoil",
      "description": "Found in Booster Packs",
      "tcgPlayerId": "88161",
      "tcgPlayerSubtype": "Holofoil",
      "notMarket": false
    }
  },
  "thumbImageUrl": "https://assets.pkmn.gg/...",
  "largeImageUrl": "https://assets.pkmn.gg/...",
  "numberDisplay": "008",
  "totalDisplay": "97",
  "releaseDate": "9/18/2003",
  "releaseDateSortKey": 1063843200000,
  "setIconUrl": "https://site.pkmn.gg/images/sets/symbols/ex3.webp",
  "tcgLiveCode": "Plusle DR 8",
  "legalities": { "standard": "Not Legal", "expanded": "Not Legal", "unlimited": "Legal", "gymLeaderChallenge": "Not Legal" },
  "subtypes": ["Basic"],
  "types": ["Lightning"],
  "attacks": [
    { "name": "Cheer On", "damage": null, "cost": ["Colorless"], "text": "Remove 1 damage counter...", "convertedEnergyCost": 1 }
  ]
}
```

### Campos usados hoy por la UI
- `id`, `name`, `variant`, `thumbImageUrl`, `setIconUrl`, `set`, `numberDisplay`, `formattedPrice`.

### Campos opcionales/condicionales importantes
- `variant`: suele aparecer cuando `separateVariants = true`.
- `priceChange`, `percentageChange`: tambien pueden venir con `separateVariants = true`.
- `variantMap`: diccionario por tipo de variante (`normal`, `holofoil`, `reverseHolofoil`, etc.).
- `boosterPacks`, `legalityBegins`, varios campos pueden ser `null`.

---

## Diferencia clave: `separateVariants`
- `false`: normalmente 1 resultado por carta base, sin separar cada variante.
- `true`: puede devolver multiples filas por misma carta (`id` repetido) con `variant` distinto y precio por variante.

Implicacion:
- Si se renderiza con key solo por `id`, puede haber colisiones.
- En UI actual se usa key compuesta con `id + variant + index`, lo cual evita ese problema.
- El mismo principio aplica a `binder_items`: el unique constraint incluye `variant` para que holo y reverse holo sean filas distintas.

---

## Manejo de errores actual
- Frontend captura excepciones de `$fetch` y muestra `error.message` o fallback.
- Server routes tiran `createError` con `statusCode`/`statusMessage` para que el cliente pueda leer `err.data.statusMessage`.
- RLS: writes sobre binders/items ajenos devuelven 401/404 (mapeamos `42501`/`PGRST301` a 404 en POST de items).

---

## Nota para Claude Code
Antes de refactors, validar:
- shape de `Card` para ambos modos (`separateVariants` true/false)
- que el JSON guardado en `cards.raw` contenga los campos que usa el render (al re-pintar desde binders usamos `raw`).
- nulos en `boosterPacks`, `legalityBegins`, `damage`, etc.
- que cualquier cambio en el server route de items preserve la semantica de "incrementar cantidad" (no overwrite).
