import { randomUUID } from "crypto"
import { groq } from "@/lib/groq"
import { prisma } from "@/lib/prisma"
import { ensureSessionId } from "@/lib/session"
import { SYSTEM_PROMPT, VISION_MODEL, safeParseDate } from "@/lib/extraction"

const MAX_BYTES = 4 * 1024 * 1024

function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get("receipt")

  if (!(file instanceof File) || file.size === 0) {
    return new Response("Selecciona un archivo de imagen.", { status: 400 })
  }
  if (!file.type.startsWith("image/")) {
    return new Response("Solo se aceptan imágenes (JPG, PNG, WEBP).", {
      status: 400,
    })
  }
  if (file.size > MAX_BYTES) {
    return new Response("Imagen demasiado grande (máx 4 MB).", { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString("base64")
  const sessionId = await ensureSessionId()
  const receiptId = randomUUID()
  const startedAt = Date.now()

  const groqStream = await groq.chat.completions.create({
    model: VISION_MODEL,
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
    max_completion_tokens: 2048,
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

        const cleaned = stripCodeFences(fullText)
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

        controller.close()
      } catch (err) {
        console.error("Streaming error:", err)
        controller.error(err)
      }
    },
  })

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "x-receipt-id": receiptId,
      "Access-Control-Expose-Headers": "x-receipt-id",
    },
  })
}
