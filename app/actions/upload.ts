"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { extractReceiptData } from "@/lib/extraction"
import { ensureSessionId } from "@/lib/session"

const MAX_BYTES = 4 * 1024 * 1024

export async function uploadReceipt(formData: FormData) {
  const file = formData.get("receipt")
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecciona un archivo de imagen.")
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Solo se aceptan imágenes (JPG, PNG, WEBP).")
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Imagen demasiado grande (máx 4 MB).")
  }

  const sessionId = await ensureSessionId()

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString("base64")

  const startedAt = Date.now()
  const extracted = await extractReceiptData(base64, file.type)
  const extractionMs = Date.now() - startedAt

  const receipt = await prisma.receipt.create({
    data: {
      sessionId,
      imageData: buffer,
      imageMimeType: file.type,
      vendorName: extracted.vendorName,
      vendorRuc: extracted.vendorRuc,
      documentType: extracted.documentType,
      documentNumber: extracted.documentNumber,
      issueDate: extracted.issueDate ? new Date(extracted.issueDate) : null,
      currency: extracted.currency,
      subtotal: extracted.subtotal,
      igv: extracted.igv,
      total: extracted.total,
      items: extracted.items as never,
      rawExtraction: extracted as never,
      extractionMs,
    },
  })

  redirect(`/receipt/${receipt.id}`)
}
