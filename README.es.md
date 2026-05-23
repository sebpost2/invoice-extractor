**[English](README.md) · [Español](README.es.md)**

---

# Invoice Extractor

[![ci](https://github.com/sebpost2/invoice-extractor/actions/workflows/ci.yml/badge.svg)](https://github.com/sebpost2/invoice-extractor/actions/workflows/ci.yml)

Aplicación web que extrae datos estructurados de boletas y facturas peruanas usando un LLM con visión. Sube una imagen, el modelo identifica proveedor, RUC, IGV, ítems y totales en tiempo real, y los guarda en una base de datos para visualizar.

Autor: [sebpost2](https://github.com/sebpost2)

**[Demo en vivo](https://invoice-extractor-gules.vercel.app)** · Sin registro · Sesión anónima por cookie

---

## Highlights

- **Extracción en streaming en vivo**: los campos extraídos aparecen en pantalla conforme el LLM emite tokens, no al final. Implementado con `ReadableStream`, SSE sobre fetch, y un parser tolerante de JSON parcial.
- **Visión multimodal**: usa Llama 4 Scout (vía Groq) para leer imágenes de boletas, incluyendo manuscritas, fotos de papel térmico y formatos electrónicos SUNAT.
- **Aislamiento por sesión**: cada visitante tiene su propio espacio vía cookie httpOnly, sin login.
- **Dashboard interactivo**: KPIs, gráfico de gasto por proveedor (donut) y por mes (barras) con Recharts.
- **Búsqueda semántica sobre boletas**: consultas libres en lenguaje natural (`"bebidas energéticas"`, `"compras de fin de mes"`) embedding con Voyage AI y match contra un índice HNSW de pgvector. Cada extracción nueva se auto-embebe; las viejas se rellenan con un script one-shot.
- **Export CSV**: descarga todas las boletas extraídas como CSV listo para Excel.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| Base de datos | PostgreSQL (Neon, serverless) + `pgvector` para embeddings |
| ORM | Prisma 7 con adapter `@prisma/adapter-pg` (`Unsupported("vector(1024)")` para la columna de embedding + raw SQL para queries cosine) |
| LLM | Llama 4 Scout 17B via Groq SDK |
| Embeddings | Voyage AI `voyage-3.5-lite` (1024-dim, multilingüe) |
| Índice vectorial | pgvector HNSW con `vector_cosine_ops` |
| Gráficos | Recharts |
| Streaming | `ReadableStream` + `partial-json` |
| Deploy | Vercel |

## Cómo funciona

```
┌──────────┐  multipart    ┌─────────────────┐   stream    ┌──────┐
│  Cliente │ ────────────> │  /api/extract   │ ──────────> │ Groq │
│ (Browser)│               │ (route handler) │  (vision)   │ LLM  │
└────┬─────┘               └────────┬────────┘             └──────┘
     │                              │
     │      chunks JSON parcial     │
     │ <────────────────────────────┤
     │                              │
     │  parsePartialJson(buffer)    │
     │  → setPartial(...)           │
     │  → re-render fields          │
     │                              │
     │                              ▼
     │                       ┌────────────┐
     │                       │   Neon DB  │
     │                       │ (Receipt)  │
     │                       └────────────┘
     │
     │  on stream complete: redirect to /receipt/[id]
```

1. El cliente sube la imagen vía `fetch` con `FormData`.
2. El route handler valida tamaño/tipo, abre stream con Groq (`stream: true`), genera un `receiptId` que devuelve en el header `x-receipt-id`.
3. Cada chunk de Groq se forward al cliente vía `ReadableStream`.
4. El cliente acumula chunks en un buffer y los parsea con `partial-json` (tolerante a JSON incompleto), actualizando el UI campo por campo.
5. Cuando el stream termina, el route handler guarda en Postgres y el cliente redirige a `/receipt/[id]`.

## Búsqueda semántica

`/search` acepta una consulta libre y devuelve las top 5 boletas rankeadas por similitud coseno. Backed por embeddings de Voyage + pgvector — sin full-text search, sin extracción manual de keywords.

Pipeline:

1. **En tiempo de extracción** (`/api/extract`) — después de que el LLM termina de streamear y la boleta se persiste, se arma una representación textual compacta (`Vendor: X || Items: A | B | C`) y se manda a Voyage como `input_type=document`. Persiste el vector de 1024-dim a la columna `embedding` vía raw SQL.
2. **En tiempo de query** (`/search` page o `POST /api/search`) — embebe la query del usuario como `input_type=query` (el modo asimétrico de Voyage boostea retrieval), luego corre `SELECT ... ORDER BY embedding <=> $query::vector LIMIT 5`. El índice HNSW hace el lookup O(log n).
3. **Scope** — resultados filtrados a la sesión del visitante + el set demo, así que los primeros visitantes ven algo útil sin tener que subir nada primero.

Decisiones de diseño:

- **Voyage en lugar de embeddings locales** (`@huggingface/transformers`): cold start de Vercel con un modelo ONNX de 100MB es 5–10s — malo para un demo. El free tier de Voyage es generoso (200M tokens lifetime) y la latencia p50 desde Lima es ~100ms.
- **`voyage-3.5-lite`** sobre `voyage-3` (full): la variante lite es ~3× más barata y rápida, y el drop de calidad en strings cortos como los de boletas es indetectable.
- **`input_type=document`/`query`** en lugar de encoders simétricos: el modo asimétrico de Voyage está específicamente tuned para retrieval y mejora medible top-K accuracy en corpora cortos.
- **`Unsupported("vector(1024)")` + raw SQL** en lugar de un plugin Prisma vector: los operadores pgvector (`<=>`, `<->`) no están en el query builder de Prisma, así que la escape hatch raw es el camino simple honesto. Schema queda declarativo para todo lo demás.
- **Best-effort embedding** en `/api/extract`: si Voyage hipa, la boleta igual se guarda — el script de backfill la recoge después. El usuario nunca ve un error de "failed to embed".

Setup one-shot (después de `prisma db push`):

```bash
npm run setup:pgvector              # CREATE EXTENSION + ALTER TABLE + CREATE INDEX
npm run embed:backfill              # embebe boletas que no tengan embedding aún
npm run embed:backfill -- --force   # re-embebe TODAS (tras cambiar buildReceiptText)
```

## Decisiones de diseño

- **Imagen guardada como `Bytes` en Postgres** en vez de Vercel Blob: simplifica setup y costo cero. Neon free permite ~5000 boletas comprimidas. Si escalara, migrar a Blob es un cambio aislado.
- **Sin auth ni login**: cookie httpOnly de un año con UUID. Friction-less para que empleadores prueben sin registrarse, datos aislados por visitante.
- **`Decimal(12,2)` para montos**: nunca `Float` para dinero. Cubre hasta S/9,999,999,999.99.
- **`temperature: 0.1` en el LLM**: extracción determinística — el mismo recibo da los mismos valores en cada llamada.
- **Top 5 + "Otros"** en el donut: gráficos con más de 6 segmentos son ilegibles.
- **Demo data sembrada** vía `npm run seed`: las 3 boletas de muestra son visibles para todos los visitantes (sessionId especial `__demo__`) sin contaminar el espacio del usuario.

## Correr localmente

### Requisitos

- Node.js 20.9+
- Una DB Postgres (recomendado: [Neon](https://neon.tech) free tier — no pausa por inactividad)
- API key de [Groq](https://console.groq.com) free tier (Llama 4 Scout)

### Setup

```bash
git clone https://github.com/<tu-usuario>/invoice-extractor
cd invoice-extractor
npm install
```

Crea `.env` en la raíz:

```env
DATABASE_URL="postgresql://user:password@host/db?sslmode=verify-full"
GROQ_API_KEY="gsk_..."
VOYAGE_API_KEY="pa-..."  # free tier en https://voyageai.com
```

Aplica el schema y siembra data demo:

```bash
npm run setup:pgvector   # habilita pgvector + agrega columna embedding + índice HNSW
npx prisma db push       # sincroniza el resto del schema (idempotente luego del setup)
npx prisma generate
npm run seed             # 3 boletas demo
npm run embed:backfill   # embebe las boletas demo para que /search funcione al primer load
```

Levanta el dev server:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL — Neon recomendado |
| `GROQ_API_KEY` | API key de Groq para Llama 4 Scout |
| `VOYAGE_API_KEY` | API key de Voyage AI para embeddings `voyage-3.5-lite` (free tier) |

## Estructura del proyecto

```
├── app/
│   ├── api/
│   │   ├── extract/route.ts      # Endpoint streaming SSE + auto-embed al guardar
│   │   ├── export/route.ts       # Export CSV
│   │   └── search/route.ts       # POST { query } → hits por similitud coseno
│   ├── dashboard/page.tsx        # Gráficos + KPIs
│   ├── receipt/[id]/page.tsx     # Detalle de boleta extraída
│   ├── search/page.tsx           # UI de búsqueda semántica (RSC + form GET)
│   └── page.tsx                  # Home: uploader + lista
├── components/
│   ├── StreamingUploader.tsx     # Cliente: lee stream, parsea JSON parcial
│   └── Charts.tsx                # Recharts (donut + barras)
├── lib/
│   ├── prisma.ts                 # Cliente Prisma con adapter Neon
│   ├── groq.ts                   # Cliente Groq singleton
│   ├── extraction.ts             # Prompt sistema + función no-streaming
│   ├── embeddings.ts             # Cliente Voyage AI + builder de texto de boleta
│   ├── search.ts                 # Query coseno con índice HNSW
│   └── session.ts                # Cookie de sesión anónima
├── prisma/
│   └── schema.prisma             # Modelo Receipt + Unsupported("vector(1024)") embedding
└── scripts/
    ├── seed-demo.ts              # Script de seed (npm run seed)
    ├── setup-pgvector.ts         # One-time: CREATE EXTENSION + INDEX
    ├── backfill-embeddings.ts    # Embebe boletas que no tengan embedding aún
    └── seed/                     # Imágenes demo
```

## Limitaciones conocidas

- El LLM puede equivocarse en boletas borrosas, manuscritas ilegibles o con condiciones de luz pobres. La precisión es ~90% en boletas digitales limpias, ~70% en fotos de papel térmico.
- No hay re-extracción ni edición manual aún — si el modelo se equivoca, hay que volver a subir.
- Solo soporta imágenes (JPG/PNG/WEBP). PDFs requerirían un paso de render previo.

---

Construido por [sebpost2](https://github.com/sebpost2) para demostrar capacidades de IA aplicada, full-stack y dashboards a partir de data real.
