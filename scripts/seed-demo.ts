import "dotenv/config"
import fs from "fs/promises"
import path from "path"
import { prisma } from "../lib/prisma"
import { extractReceiptData } from "../lib/extraction"
import { DEMO_SESSION_ID } from "../lib/session"

const SEED_DIR = path.join(process.cwd(), "scripts", "seed")

type Seed = {
  filename: string
  mimeType: string
}

const seeds: Seed[] = [
  { filename: "boleta-1.jpg", mimeType: "image/jpeg" },
  { filename: "boleta-2.webp", mimeType: "image/webp" },
]

async function main() {
  console.log("🧹 Limpiando datos demo previos...")
  const deleted = await prisma.receipt.deleteMany({
    where: { sessionId: DEMO_SESSION_ID },
  })
  console.log(`   ${deleted.count} boleta(s) demo eliminada(s).\n`)

  for (const seed of seeds) {
    const filePath = path.join(SEED_DIR, seed.filename)
    console.log(`📤 ${seed.filename}`)

    const buffer = await fs.readFile(filePath)
    const base64 = buffer.toString("base64")

    const startedAt = Date.now()
    const extracted = await extractReceiptData(base64, seed.mimeType)
    const extractionMs = Date.now() - startedAt

    const receipt = await prisma.receipt.create({
      data: {
        sessionId: DEMO_SESSION_ID,
        imageData: buffer,
        imageMimeType: seed.mimeType,
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

    console.log(
      `   → ${receipt.vendorName ?? "(sin nombre)"} | ${receipt.currency} ${receipt.total ?? "—"} | ${extractionMs}ms\n`,
    )
  }

  console.log("🎉 Seed completada.")
}

main()
  .catch((err) => {
    console.error("❌ Error en seed:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
