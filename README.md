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
- **CSV export**: download all extracted receipts as Excel-ready CSV.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL (Neon, serverless) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| LLM | Llama 4 Scout 17B via Groq SDK |
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
```

Apply the schema and seed demo data:

```bash
npx prisma db push
npx prisma generate
npm run seed
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

## Project structure

```
├── app/
│   ├── api/
│   │   ├── extract/route.ts      # SSE streaming endpoint
│   │   └── export/route.ts       # CSV export
│   ├── dashboard/page.tsx        # Charts + KPIs
│   ├── receipt/[id]/page.tsx     # Extracted receipt detail
│   └── page.tsx                  # Home: uploader + list
├── components/
│   ├── StreamingUploader.tsx     # Client: reads stream, parses partial JSON
│   └── Charts.tsx                # Recharts (donut + bars)
├── lib/
│   ├── prisma.ts                 # Prisma client with Neon adapter
│   ├── groq.ts                   # Groq client singleton
│   ├── extraction.ts             # System prompt + non-streaming function
│   └── session.ts                # Anonymous session cookie
├── prisma/
│   └── schema.prisma             # Receipt model
└── scripts/
    ├── seed-demo.ts              # Seed script (npm run seed)
    └── seed/                     # Demo images
```

## Known limitations

- The LLM can be wrong on blurry receipts, illegible handwriting, or poor lighting. Accuracy is roughly ~90% on clean digital receipts and ~70% on thermal-paper photos.
- No re-extraction or manual editing yet — if the model gets it wrong, you have to re-upload.
- Only supports images (JPG/PNG/WEBP). PDFs would require a render step first.

---

Built by [sebpost2](https://github.com/sebpost2) to showcase applied AI, full-stack and dashboarding skills on real-world data.
