**[English](README.md) · [Español](README.es.md)**

---

# Invoice Extractor

Aplicación web que extrae datos estructurados de boletas y facturas peruanas usando un LLM con visión. Sube una imagen, el modelo identifica proveedor, RUC, IGV, ítems y totales en tiempo real, y los guarda en una base de datos para visualizar.

Autor: [sebpost2](https://github.com/sebpost2)

**[Demo en vivo](https://invoice-extractor-gules.vercel.app)** · Sin registro · Sesión anónima por cookie

---

## Highlights

- **Extracción en streaming en vivo**: los campos extraídos aparecen en pantalla conforme el LLM emite tokens, no al final. Implementado con `ReadableStream`, SSE sobre fetch, y un parser tolerante de JSON parcial.
- **Visión multimodal**: usa Llama 4 Scout (vía Groq) para leer imágenes de boletas, incluyendo manuscritas, fotos de papel térmico y formatos electrónicos SUNAT.
- **Aislamiento por sesión**: cada visitante tiene su propio espacio vía cookie httpOnly, sin login.
- **Dashboard interactivo**: KPIs, gráfico de gasto por proveedor (donut) y por mes (barras) con Recharts.
- **Export CSV**: descarga todas las boletas extraídas como CSV listo para Excel.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| Base de datos | PostgreSQL (Neon, serverless) |
| ORM | Prisma 7 con adapter `@prisma/adapter-pg` |
| LLM | Llama 4 Scout 17B via Groq SDK |
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
```

Aplica el schema y siembra data demo:

```bash
npx prisma db push
npx prisma generate
npm run seed
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

## Estructura del proyecto

```
├── app/
│   ├── api/
│   │   ├── extract/route.ts      # Endpoint streaming SSE
│   │   └── export/route.ts       # Export CSV
│   ├── dashboard/page.tsx        # Gráficos + KPIs
│   ├── receipt/[id]/page.tsx     # Detalle de boleta extraída
│   └── page.tsx                  # Home: uploader + lista
├── components/
│   ├── StreamingUploader.tsx     # Cliente: lee stream, parsea JSON parcial
│   └── Charts.tsx                # Recharts (donut + barras)
├── lib/
│   ├── prisma.ts                 # Cliente Prisma con adapter Neon
│   ├── groq.ts                   # Cliente Groq singleton
│   ├── extraction.ts             # Prompt sistema + función no-streaming
│   └── session.ts                # Cookie de sesión anónima
├── prisma/
│   └── schema.prisma             # Modelo Receipt
└── scripts/
    ├── seed-demo.ts              # Script de seed (npm run seed)
    └── seed/                     # Imágenes demo
```

## Limitaciones conocidas

- El LLM puede equivocarse en boletas borrosas, manuscritas ilegibles o con condiciones de luz pobres. La precisión es ~90% en boletas digitales limpias, ~70% en fotos de papel térmico.
- No hay re-extracción ni edición manual aún — si el modelo se equivoca, hay que volver a subir.
- Solo soporta imágenes (JPG/PNG/WEBP). PDFs requerirían un paso de render previo.

---

Construido por [sebpost2](https://github.com/sebpost2) para demostrar capacidades de IA aplicada, full-stack y dashboards a partir de data real.
