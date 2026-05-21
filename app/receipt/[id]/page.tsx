import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getSessionId, DEMO_SESSION_ID } from "@/lib/session"

type Item = {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sessionId = await getSessionId()
  const visibleSessions = sessionId
    ? [sessionId, DEMO_SESSION_ID]
    : [DEMO_SESSION_ID]

  const receipt = await prisma.receipt.findFirst({
    where: { id, sessionId: { in: visibleSessions } },
  })
  if (!receipt) notFound()

  const items = (receipt.items as Item[] | null) ?? []
  const imageDataUri = `data:${receipt.imageMimeType};base64,${Buffer.from(
    receipt.imageData,
  ).toString("base64")}`

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/" className="text-blue-400 hover:underline text-sm">
          ← Volver
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded p-4">
            <h2 className="text-xs uppercase text-zinc-500 mb-2 tracking-wide">
              Imagen original
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageDataUri} alt="Receipt" className="w-full rounded" />
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-900 rounded p-4 space-y-2">
              <h2 className="text-xs uppercase text-zinc-500 tracking-wide">
                Datos extraídos
              </h2>
              <Field label="Proveedor" value={receipt.vendorName} />
              <Field label="RUC" value={receipt.vendorRuc} />
              <Field
                label="Documento"
                value={
                  [receipt.documentType, receipt.documentNumber]
                    .filter(Boolean)
                    .join(" ") || null
                }
              />
              <Field
                label="Fecha"
                value={receipt.issueDate?.toLocaleDateString() ?? null}
              />

              <div className="grid grid-cols-3 gap-2 pt-3">
                <MoneyBox
                  label="Subtotal"
                  value={receipt.subtotal}
                  currency={receipt.currency}
                />
                <MoneyBox
                  label="IGV"
                  value={receipt.igv}
                  currency={receipt.currency}
                />
                <MoneyBox
                  label="Total"
                  value={receipt.total}
                  currency={receipt.currency}
                  highlight
                />
              </div>
              <p className="text-xs text-zinc-500 pt-3">
                Extraído en {receipt.extractionMs} ms
              </p>
            </div>

            {items.length > 0 && (
              <div className="bg-zinc-900 rounded p-4">
                <h2 className="text-xs uppercase text-zinc-500 mb-2 tracking-wide">
                  Ítems
                </h2>
                <table className="w-full text-sm">
                  <thead className="text-zinc-500 text-xs">
                    <tr>
                      <th className="text-left pb-2">Descripción</th>
                      <th className="text-right pb-2">Cant.</th>
                      <th className="text-right pb-2">P.U.</th>
                      <th className="text-right pb-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className="border-t border-zinc-800">
                        <td className="py-1.5">{it.description}</td>
                        <td className="text-right">{it.quantity}</td>
                        <td className="text-right">
                          {it.unitPrice?.toFixed(2)}
                        </td>
                        <td className="text-right">{it.total?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span>{value || "—"}</span>
    </div>
  )
}

function MoneyBox({
  label,
  value,
  currency,
  highlight,
}: {
  label: string
  value: unknown
  currency: string
  highlight?: boolean
}) {
  const numeric = value != null ? Number(value) : null
  return (
    <div
      className={`rounded p-2 ${
        highlight
          ? "bg-blue-900/30 border border-blue-700"
          : "bg-zinc-800"
      }`}
    >
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm font-medium">
        {numeric != null ? `${currency} ${numeric.toFixed(2)}` : "—"}
      </div>
    </div>
  )
}
