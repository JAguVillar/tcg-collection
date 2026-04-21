# Nuxt Collection - Contexto para Claude Code

## Que es este proyecto
Aplicacion Nuxt 4 para buscar cartas de Pokemon usando un endpoint interno que proxea a `pkmn.gg`, con:
- busqueda por texto
- orden por campos
- paginacion
- opcion `separateVariants` para separar variantes por precio/tipo

## Stack
- Nuxt `4.4.2`
- Vue `3.5.x`
- Nuxt UI `4.6.x`
- Tailwind CSS `4.x`

## Archivos clave
- `app/pages/index.vue` -> UI principal.
- `app/composables/useCardSearch.js` -> estado y logica de busqueda/paginacion/sort.
- `server/api/cards/search.post.js` -> endpoint server-side (proxy).
- `nuxt.config.ts` -> configuracion Nuxt + modulo `@nuxt/ui`.

---

## Endpoints actuales

## 1) Interno (frontend -> Nuxt server)
**POST** `/api/cards/search`

### Uso en frontend
Se invoca con `$fetch` desde `useCardSearch.js` en:
- `searchCards()` (nueva busqueda)
- `loadMore()` (pagina siguiente)

### Request body (shape actual)
El body se fusiona con defaults para asegurar campos requeridos.

```json
{
  "query": "",
  "cardTypes": [],
  "subTypes": [],
  "sets": [],
  "energyTypes": [],
  "rarities": [],
  "weaknessTypes": [],
  "resistanceTypes": [],
  "retreatCosts": [],
  "hitPoints": [],
  "nationalPokedexNumbers": [],
  "attackQuery": null,
  "numberQuery": null,
  "abilityQuery": null,
  "evolvesFromQuery": null,
  "page": 1,
  "isAscending": true,
  "sortField": 7,
  "artists": [],
  "collectionMode": false,
  "userId": "27d09d531bb7cd8eac4a6b2bd1fe0701",
  "category": "EN",
  "separateVariants": false
}
```

### Response envelope
```json
{
  "message": "Successfully retrieved search results",
  "value": [/* Card[] */],
  "code": 200,
  "hits": 41
}
```

---

## 2) Externo (Nuxt server -> upstream)
**POST** `https://www.pkmn.gg/api/search/advanced`

El endpoint interno actua como proxy y devuelve la respuesta upstream casi sin transformacion.

---

## Sort fields (mapping numerico)
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
  "legalities": {
    "standard": "Not Legal",
    "expanded": "Not Legal",
    "unlimited": "Legal",
    "gymLeaderChallenge": "Not Legal"
  },
  "subtypes": ["Basic"],
  "types": ["Lightning"],
  "attacks": [
    {
      "name": "Cheer On",
      "damage": null,
      "cost": ["Colorless"],
      "text": "Remove 1 damage counter...",
      "convertedEnergyCost": 1
    }
  ]
}
```

### Campos usados hoy por la UI
- `id`
- `name`
- `variant` (cuando viene separado por variante)
- `thumbImageUrl`
- `setIconUrl`
- `set`
- `numberDisplay`
- `formattedPrice`

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

---

## Flujo funcional actual
1. Al cargar la pagina, se dispara `searchCards({ query: "rowlet" })`.
2. Submit del buscador -> nueva busqueda pagina 1.
3. Toggle `separateVariants` -> relanza busqueda.
4. `Load More` incrementa `page` y concatena resultados.
5. Si `value.length === 0`, se marca `hasMore = false`.

---

## Manejo de errores actual
- Frontend captura excepciones de `$fetch` y muestra `error.message` o fallback.
- Backend proxy no normaliza errores en un schema propio (delegado al upstream/error runtime).

---

## Nota para Claude Code
Antes de refactors, validar:
- shape de `Card` para ambos modos (`separateVariants` true/false)
- tipo de `sortPrice` (a veces string formateado, a veces numerico segun respuestas observadas)
- nulos en `boosterPacks`, `legalityBegins`, `damage`, etc.
- que cualquier cambio de tipos preserve el render actual en `index.vue`
