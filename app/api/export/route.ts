import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionId, DEMO_SESSION_ID } from "@/lib/session"

export async function GET() {
  const sessionId = await getSessionId()
  const visibleSessions = sessionId
    ? [sessionId, DEMO_SESSION_ID]
    : [DEMO_SESSION_ID]

  const receipts = await prisma.receipt.findMany({
    where: { sessionId: { in: visibleSessions } },
    orderBy: { createdAt: "desc" },
    select: {
      issueDate: true,
      vendorName: true,
      vendorRuc: true,
      documentType: true,
      documentNumber: true,
      currency: true,
      subtotal: true,
      igv: true,
      total: true,
      createdAt: true,
    },
  })

  const header =
    "issueDate,vendorName,vendorRuc,documentType,documentNumber,currency,subtotal,igv,total,extractedAt\n"

  const rows = receipts
    .map((r) =>
      [
        r.issueDate ? r.issueDate.toISOString().split("T")[0] : "",
        csvEscape(r.vendorName),
        r.vendorRuc ?? "",
        r.documentType ?? "",
        csvEscape(r.documentNumber),
        r.currency,
        r.subtotal != null ? Number(r.subtotal).toFixed(2) : "",
        r.igv != null ? Number(r.igv).toFixed(2) : "",
        r.total != null ? Number(r.total).toFixed(2) : "",
        r.createdAt.toISOString(),
      ].join(","),
    )
    .join("\n")

  const today = new Date().toISOString().split("T")[0]

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="boletas-${today}.csv"`,
    },
  })
}

function csvEscape(value: string | null | undefined): string {
  if (!value) return ""
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
