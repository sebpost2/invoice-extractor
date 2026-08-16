import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// One-off backfill: receipts extracted before the CLP-detection prompt fix
// were saved with currency: "PEN" even when the document was the Chilean
// Nobitex boleta. Corrects those historical rows. Remove this route once run.
export async function POST() {
  const result = await prisma.receipt.updateMany({
    where: {
      vendorName: { contains: "NOBITEX", mode: "insensitive" },
      currency: "PEN",
    },
    data: { currency: "CLP" },
  })

  return NextResponse.json({ updated: result.count })
}
