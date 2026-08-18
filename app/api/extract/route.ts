import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { groq } from "@/lib/groq"
import { prisma } from "@/lib/prisma"
import { buildSessionCookieHeader, ensureSessionId, getSessionId } from "@/lib/session"
import { SYSTEM_PROMPT, VISION_MODEL, extractJson, safeParseDate } from "@/lib/extraction"
import { embedReceipt, toPgvectorLiteral } from "@/lib/embeddings"
import { isRateLimited } from "@/lib/rate-limit"
import { getDict } from "@/lib/i18n"

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60_000

export async function POST(req: Request) {
  const t = await getDict()

  const rateKey =
    (await getSessionId()) ?? req.headers.get("x-forwarded-for") ?? "anonymous"
  if (isRateLimited(rateKey, RATE_LIMIT, RATE_WINDOW_MS)) {
    return new Response(t.api.errRateLimited, { status: 429 })
  }

  const formData = await req.formData()
  const file = formData.get("receipt")

  if (!(file instanceof File) || file.size === 0) {
    return new Response(t.api.errNoFile, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(t.api.errFileType, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return new Response(t.api.errFileTooBig, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString("base64")
  const { sessionId, isNew } = await ensureSessionId()
  const receiptId = randomUUID()
  const startedAt = Date.now()

  const groqStream = await groq.chat.completions.create({
    model: VISION_MODEL,
    // Reasoning was silently eating the token budget before the JSON body
    // could finish, truncating the stream mid-object (JSON.parse failure
    // below). This model doesn't need to reason for a structured extraction
    // task, so disable it outright instead of just hiding its output.
    reasoning_effort: "none",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Extrae los datos de esta boleta o factura." },
          {
            type: "image_url",
            image_url: { url: `data:${file.type};base64,${base64}` },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_completion_tokens: 4096,
    stream: true,
  })

  const encoder = new TextEncoder()

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = ""

      try {
        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content ?? ""
          if (delta) {
            fullText += delta
            controller.enqueue(encoder.encode(delta))
          }
        }

        const cleaned = extractJson(fullText)
        const parsed = JSON.parse(cleaned)
        const extractionMs = Date.now() - startedAt

        await prisma.receipt.create({
          data: {
            id: receiptId,
            sessionId,
            imageData: buffer,
            imageMimeType: file.type,
            vendorName: parsed.vendorName ?? null,
            vendorRuc: parsed.vendorRuc ?? null,
            documentType: parsed.documentType ?? null,
            documentNumber: parsed.documentNumber ?? null,
            issueDate: safeParseDate(parsed.issueDate),
            currency: parsed.currency || "PEN",
            subtotal: parsed.subtotal ?? null,
            igv: parsed.igv ?? null,
            total: parsed.total ?? null,
            items: (parsed.items ?? []) as never,
            rawExtraction: parsed as never,
            extractionMs,
          },
        })

        // Best-effort: embed the receipt for semantic search. We don't fail
        // the extraction if Voyage hiccups — the receipt is already saved
        // and a backfill script can pick it up later.
        try {
          const vector = await embedReceipt({
            vendorName: parsed.vendorName ?? null,
            documentType: parsed.documentType ?? null,
            documentNumber: parsed.documentNumber ?? null,
            items: parsed.items ?? [],
          })
          await prisma.$executeRawUnsafe(
            `UPDATE "Receipt" SET "embedding" = $1::vector WHERE id = $2`,
            toPgvectorLiteral(vector),
            receiptId,
          )
        } catch (embedErr) {
          console.error("Embedding failed (receipt is still saved):", embedErr)
        }

        controller.close()
      } catch (err) {
        console.error("Streaming error:", err)
        controller.error(err)
      }
    },
  })

  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "x-receipt-id": receiptId,
    "Access-Control-Expose-Headers": "x-receipt-id",
  })
  if (isNew) {
    headers.set("Set-Cookie", buildSessionCookieHeader(sessionId))
  }

  return new NextResponse(responseStream, { headers })
}
