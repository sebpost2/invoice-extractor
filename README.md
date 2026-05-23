**[English](README.md) · [Español](README.es.md)**

---

# Invoice Extractor

[![ci](https://github.com/sebpost2/invoice-extractor/actions/workflows/ci.yml/badge.svg)](https://github.com/sebpost2/invoice-extractor/actions/workflows/ci.yml)

Web app that extracts structured data from Peruvian receipts and invoices using a vision LLM. Upload an image — the model identifies vendor, tax ID (RUC), VAT (IGV), line items and totals in real time, and persists them to a database for visualization.

Author: [sebpost2](https://github.com/sebpost2)

**[Live demo](https://invoice-extractor-gules.vercel.app)** · No sign-up · Anonymous cookie-based session

---

## Highlights

- **Live streaming extraction**: extracted fields appear on screen as the LLM emits tokens, not at the end. Implemented with `ReadableStream`, SSE over fetch, and a fault-tolerant partial-JSON parser.
- **Multimodal vision**: uses Llama 4 Scout (via Groq) to read receipt images, including handwritten ones, thermal-paper photos and SUNAT electronic formats.
- **Per-session isolation**: each visitor gets their own space via a `httpOnly` cookie — no login required.
- **Interactive dashboard**: KPIs, spend-by-vendor (donut) and spend-by-month (bars) charts with Recharts.
- **Semantic search over receipts**: free-form natural-language queries (`"energy drinks"`, `"end-of-month groceries"`) embedded by Voyage AI and matched against a pgvector HNSW index. Each new extraction is auto-embedded; old ones can be backfilled with a one-shot script.
- **CSV export**: download all extracted receipts as Excel-ready CSV.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Neon, serverless) + `pgvector` for embeddings |
| ORM | Prisma 7 with `@prisma/adapter-pg` (`Unsupported("vector(1024)")` for the embedding column + raw SQL for cosine queries) |
| LLM | Llama 4 Scout 17B via Groq SDK |
| Embeddings | Voyage AI `voyage-3.5-lite` (1024-dim, multilingual) |
| Vector index | pgvector HNSW with `vector_cosine_ops` |
| Charts | Recharts |
| Streaming | `ReadableStream` + `partial-json` |
| Deploy | Vercel |

## How it works

```
┌──────────┐  multipart    ┌─────────────────┐   stream    ┌──────┐
│  Client  │ ────────────> │  /api/extract   │ ──────────> │ Groq │
│ (Browser)│               │ (route handler) │  (vision)   │ LLM  │
└────┬─────┘               └────────┬────────┘             └──────┘
     │                              │
     │     partial JSON chunks      │
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

1. Client uploads the image via `fetch` with `FormData`.
2. The route handler validates size/type, opens a Groq stream (`stream: true`), and returns a `receiptId` in the `x-receipt-id` header.
3. Each Groq chunk is forwarded to the client through `ReadableStream`.
4. The client accumulates chunks in a buffer and parses them with `partial-json` (tolerant to incomplete JSON), updating the UI field by field.
5. Once the stream finishes, the route handler persists to Postgres and the client redirects to `/receipt/[id]`.

## Semantic search

`/search` accepts a free-form query and returns the top 5 receipts ranked by cosine similarity. Backed by Voyage embeddings + pgvector — no full-text search, no manual keyword extraction.

Pipeline:

1. **At extraction time** (`/api/extract` route handler) — after the LLM finishes streaming and the receipt is persisted, build a compact text representation (`Vendor: X || Items: A | B | C`) and send it to Voyage as `input_type=document`. Persist the 1024-dim vector to the `embedding` column via raw SQL.
2. **At query time** (`/search` page or `POST /api/search`) — embed the user's query as `input_type=query` (Voyage's asymmetric mode boosts retrieval), then run `SELECT ... ORDER BY embedding <=> $query::vector LIMIT 5`. The HNSW index makes the lookup O(log n).
3. **Scope** — results are filtered to the visitor's session + the demo set, so first-time visitors see something useful without uploading.

Design choices:

- **Voyage over local embeddings** (`@huggingface/transformers`): Vercel cold start with a 100MB ONNX model is 5–10s — bad for a demo page. Voyage's free tier is generous (200M tokens lifetime) and p50 latency from Lima is ~100ms.
- **`voyage-3.5-lite`** over `voyage-3` (full): the lite variant is ~3× cheaper and faster, and the quality drop on short receipt strings is undetectable.
- **`input_type=document`/`query`** instead of symmetric encoders: Voyage's asymmetric mode is specifically tuned for retrieval and measurably improves top-K accuracy on short corpora.
- **`Unsupported("vector(1024)")` + raw SQL** instead of a Prisma vector plugin: pgvector operators (`<=>`, `<->`) aren't in Prisma's query builder, so the raw escape hatch is the simpler honest path. Schema stays declarative for everything else.
- **Best-effort embedding** in `/api/extract`: if Voyage hiccups, the receipt is still saved — the backfill script picks it up later. The user never sees a "failed to embed" error.

One-shot setup (after `prisma db push`):

```bash
npm run setup:pgvector              # CREATE EXTENSION + ALTER TABLE + CREATE INDEX
npm run embed:backfill              # embed receipts that don't have an embedding yet
npm run embed:backfill -- --force   # re-embed every receipt (after changing buildReceiptText)
```

## Design decisions

- **Image stored as `Bytes` in Postgres** instead of Vercel Blob: simpler setup, zero cost. Neon's free tier fits ~5000 compressed receipts. Migrating to Blob if it ever scales is an isolated change.
- **No auth, no login**: one-year `httpOnly` cookie with a UUID. Friction-less for recruiters to try without signing up; data is isolated per visitor.
- **`Decimal(12,2)` for amounts**: never `Float` for money. Covers up to S/9,999,999,999.99.
- **`temperature: 0.1` on the LLM**: deterministic extraction — the same receipt yields the same values on every call.
- **Top 5 + "Others"** in the donut chart: charts with more than 6 segments become unreadable.
- **Demo data seeded** via `npm run seed`: the 3 sample receipts are visible to every visitor (special `sessionId = "__demo__"`) without polluting the user's space.

## Running locally

### Requirements

- Node.js 20.9+
- A Postgres database (recommended: [Neon](https://neon.tech) free tier — no idle-time pauses)
- A free [Groq](https://console.groq.com) API key (Llama 4 Scout)

### Setup

```bash
git clone https://github.com/<your-user>/invoice-extractor
cd invoice-extractor
npm install
```

Create `.env` at the root:

```env
DATABASE_URL="postgresql://user:password@host/db?sslmode=verify-full"
GROQ_API_KEY="gsk_..."
VOYAGE_API_KEY="pa-..."  # free tier at https://voyageai.com
```

Apply the schema and seed demo data:

```bash
npm run setup:pgvector   # enable pgvector + add embedding column + HNSW index
npx prisma db push       # syncs the rest of the schema (idempotent after setup)
npx prisma generate
npm run seed             # 3 demo receipts
npm run embed:backfill   # embed the demo receipts so /search works on first load
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string — Neon recommended |
| `GROQ_API_KEY` | Groq API key for Llama 4 Scout |
| `VOYAGE_API_KEY` | Voyage AI API key for `voyage-3.5-lite` embeddings (free tier) |

## Project structure

```
├── app/
│   ├── api/
│   │   ├── extract/route.ts      # SSE streaming endpoint + auto-embed on save
│   │   ├── export/route.ts       # CSV export
│   │   └── search/route.ts       # POST { query } → cosine similarity hits
│   ├── dashboard/page.tsx        # Charts + KPIs
│   ├── receipt/[id]/page.tsx     # Extracted receipt detail
│   ├── search/page.tsx           # Semantic search UI (RSC + GET form)
│   └── page.tsx                  # Home: uploader + list
├── components/
│   ├── StreamingUploader.tsx     # Client: reads stream, parses partial JSON
│   └── Charts.tsx                # Recharts (donut + bars)
├── lib/
│   ├── prisma.ts                 # Prisma client with Neon adapter
│   ├── groq.ts                   # Groq client singleton
│   ├── extraction.ts             # System prompt + non-streaming function
│   ├── embeddings.ts             # Voyage AI client + receipt text builder
│   ├── search.ts                 # Cosine query with HNSW index
│   └── session.ts                # Anonymous session cookie
├── prisma/
│   └── schema.prisma             # Receipt model + Unsupported("vector(1024)") embedding
└── scripts/
    ├── seed-demo.ts              # Seed script (npm run seed)
    ├── setup-pgvector.ts         # One-time: CREATE EXTENSION + INDEX
    ├── backfill-embeddings.ts    # Embed any receipts that don't have one yet
    └── seed/                     # Demo images
```

## Known limitations

- The LLM can be wrong on blurry receipts, illegible handwriting, or poor lighting. Accuracy is roughly ~90% on clean digital receipts and ~70% on thermal-paper photos.
- No re-extraction or manual editing yet — if the model gets it wrong, you have to re-upload.
- Only supports images (JPG/PNG/WEBP). PDFs would require a render step first.

---

Built by [sebpost2](https://github.com/sebpost2) to showcase applied AI, full-stack and dashboarding skills on real-world data.
