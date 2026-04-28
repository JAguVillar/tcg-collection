# Scrapeo masivo de pkmn.gg → Supabase

Backup completo del catálogo de cartas de pkmn.gg en dos fases:

1. **fetch** — descarga todas las cartas de pkmn.gg a archivos NDJSON locales (`data/cards-EN.ndjson`, `data/cards-JP.ndjson`). Lento (red + rate-limit), pero **ese NDJSON es tu backup real**: vive en disco, no depende de Supabase ni de pkmn.gg.
2. **load** — lee los NDJSON y hace `upsert` a la tabla `public.cards` de Supabase. Rápido, offline, idempotente.

Esto separa la parte frágil (HTTP a un endpoint que no controlamos) de la parte rápida (cargar a la BD), y te deja un backup que podés restaurar en cualquier Supabase nuevo.

---

## Pre-requisitos

- Node 18+ (para `fetch` global y `import` ESM).
- `.env` en la raíz del repo con `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` (sólo necesarios para la fase **load**; **fetch** no toca Supabase).
- `npm install` ya corrido (usa `@supabase/supabase-js` que ya es dependencia).

> El service role key bypassea RLS. Nunca lo subas al repo ni al cliente.

---

## Instructivo paso a paso (el día que decidas hacer la subida)

### 1. Asegurate de estar en `main` actualizado

```bash
git checkout main
git pull
```

(O en la branch donde quedó mergeado el scraper.)

### 2. Configurá las variables de entorno

```bash
cp .env.example .env  # si todavía no existe
# editar .env y completar:
#   SUPABASE_URL=https://<project>.supabase.co
#   SUPABASE_SERVICE_KEY=<service_role key del dashboard, NO el anon>
```

`SUPABASE_SERVICE_KEY` se obtiene de Supabase Dashboard → Project Settings → API → `service_role`.

### 3. Fase 1 — bajar todo a NDJSON

```bash
npm run scrape:cards:fetch
```

Esto va a:
- Pegarle a `pkmn.gg/api/search/advanced` con `category=EN` paginando hasta agotar resultados.
- Volcar cada carta como una línea JSON a `data/cards-EN.ndjson`.
- Repetir lo mismo con `category=JP` → `data/cards-JP.ndjson`.
- Guardar progreso en `data/.fetch-checkpoint.json` después de cada página.

**Tiempo estimado:** ~6–15 min por categoría con el delay de 500 ms entre requests. Dejalo corriendo en una terminal.

**Si se corta** (Ctrl+C, error de red, lo que sea), simplemente volvé a correr el mismo comando. Retoma desde la última página que terminó OK.

**Variantes útiles:**

```bash
npm run scrape:cards:fetch -- --category=EN     # solo EN
npm run scrape:cards:fetch -- --category=JP     # solo JP
npm run scrape:cards:fetch -- --reset           # tirar NDJSON + checkpoint y arrancar de 0
npm run scrape:cards:fetch -- --start-page=42   # forzar arranque desde la página N
```

### 4. (Importante) Backupeá los NDJSON antes de cargar

Los archivos NDJSON son tu backup real e independiente. Copialos a algún lado seguro:

```bash
# tamaño esperado: ~50–100 MB combinado
ls -lh data/cards-*.ndjson

# opciones de backup (elegí una):
cp data/cards-EN.ndjson ~/backups/tcg/
cp data/cards-JP.ndjson ~/backups/tcg/
# o subí a un bucket privado de S3/GDrive/Dropbox/iCloud
```

Estos archivos están en `.gitignore` a propósito (son grandes y son data, no código).

### 5. Verificá rápido que el NDJSON quedó bien

```bash
# cantidad de cartas por categoría
wc -l data/cards-EN.ndjson data/cards-JP.ndjson

# inspeccionar la primera carta de EN
head -1 data/cards-EN.ndjson | jq

# que tengan variantMap poblado
head -1 data/cards-EN.ndjson | jq '.variantMap'
```

EN debería rondar las 15–20k líneas. JP varía.

### 6. Fase 2 — cargar a Supabase

```bash
npm run scrape:cards:load
```

Esto va a:
- Leer `data/cards-EN.ndjson` y `data/cards-JP.ndjson`.
- Mapear cada carta al shape de la tabla `cards` (mismo mapper que usa el server hoy).
- Hacer `upsert` por lotes de 100 con `onConflict: id`.
- Loggear progreso cada batch.

**Tiempo estimado:** <2 min combinado. Es 100% idempotente — re-correrlo no duplica filas, sólo refresca `raw` y `updated_at`.

**Variantes:**

```bash
npm run scrape:cards:load -- --category=EN              # solo EN
npm run scrape:cards:load -- --file=data/cards-EN.ndjson # archivo arbitrario
```

### 7. Verificación post-carga (Supabase SQL editor)

```sql
-- conteo por categoría
select category, count(*) from public.cards group by category;

-- cantidad de sets distintos
select category, count(distinct set_id) from public.cards group by category;

-- sanity check: variantMap presente
select count(*) from public.cards where (raw->'variantMap') is not null;

-- algunas cartas con su variantMap
select id, name, set_name, raw->'variantMap'
from public.cards
order by random()
limit 5;
```

EN: esperá ~15–20k filas, ~70+ sets. JP varía según catálogo.

### 8. Test end-to-end de la app

```bash
npm run dev
```

1. Login.
2. Abrí un binder existente (o crealo y agregá cartas).
3. Cerralo, refrescá. Las cartas deben renderizar leyendo `cards.raw` desde Supabase.
4. Bonus paranoid test: editá temporalmente `server/utils/pkmnSearch.js:1` y ponele una URL inválida. La búsqueda en `/` se va a romper (eso depende de pkmn.gg directo y queda fuera de scope), pero `/binders/:id` debe seguir funcionando porque tira 100% del cache local.

---

## Cómo resembrar un Supabase nuevo desde el backup

Si el día de mañana cambiás de proyecto Supabase o querés clonar a otro environment:

1. Aplicar las migraciones de `supabase/migrations/` (deja la tabla `cards` vacía pero existente).
2. Poner el nuevo `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` en `.env`.
3. Copiar tus NDJSON backupeados a `data/cards-EN.ndjson` y `data/cards-JP.ndjson`.
4. `npm run scrape:cards:load`.

Listo. Catálogo restaurado en <2 min, sin tocar pkmn.gg.

---

## Refresh incremental (a futuro)

Esto sólo congela los precios al momento del scrape. Cuando quieras refrescarlos:

```bash
npm run scrape:cards:fetch -- --reset   # bajar todo de nuevo
npm run scrape:cards:load               # upsert refresca raw/updated_at sin tocar binder_items
```

Nada de RLS rompe porque la tabla `cards` está separada de las tablas de usuario (`binders`, `binder_items`).

---

## Troubleshooting

- **`fetch` se cuelga muchos minutos**: pkmn.gg quizá está rate-limiteando. Cortá con Ctrl+C y volvé a correr; el backoff de 2/4/8/16 s ya está incorporado pero si el bloqueo persiste subí `REQUEST_DELAY_MS` en `scripts/scrape-cards.mjs`.
- **`load` falla con "Supabase upsert failed"**: confirmá que `SUPABASE_SERVICE_KEY` es el `service_role` (no el `anon`), y que la tabla `public.cards` existe (correr migraciones primero).
- **NDJSON con líneas corruptas**: si una corrida de `fetch` se cortó en el medio de un `appendFile`, podría quedar una línea parcial al final. `load` la skipea (`skipped` en el resumen). Si querés ser purista: `npm run scrape:cards:fetch -- --reset` y volvé a bajar.
- **Quiero forzar empezar de nuevo**: `rm data/cards-*.ndjson data/.fetch-checkpoint.json` o `--reset`.

---

## Archivos relevantes

- `scripts/scrape-cards.mjs` — script con subcomandos `fetch` y `load`.
- `data/cards-EN.ndjson`, `data/cards-JP.ndjson` — output de `fetch`, input de `load`. Gitignored.
- `data/.fetch-checkpoint.json` — última página completada por categoría. Gitignored.
- `server/utils/cards.js` — mapper original `cardToRow` (replicado dentro del script).
- `supabase/migrations/0001_init_collection.sql` — schema de la tabla `cards`.
