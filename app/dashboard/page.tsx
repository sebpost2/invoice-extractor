import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getSessionId, DEMO_SESSION_ID } from "@/lib/session"
import { MonthlyBarChart, VendorPieChart } from "@/components/Charts"

export const dynamic = "force-dynamic"

type Receipt = {
  vendorName: string | null
  total: number | null
  currency: string
  issueDate: Date | null
}

export default async function DashboardPage() {
  const sessionId = await getSessionId()
  const visibleSessions = sessionId
    ? [sessionId, DEMO_SESSION_ID]
    : [DEMO_SESSION_ID]

  const rows = await prisma.receipt.findMany({
    where: { sessionId: { in: visibleSessions } },
    select: {
      vendorName: true,
      total: true,
      currency: true,
      issueDate: true,
    },
  })

  const receipts: Receipt[] = rows.map((r) => ({
    vendorName: r.vendorName,
    total: r.total != null ? Number(r.total) : null,
    currency: r.currency,
    issueDate: r.issueDate,
  }))

  const stats = computeStats(receipts)
  const monthlyData = computeMonthly(receipts)
  const vendorData = computeVendors(receipts)

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <nav className="flex justify-between items-center">
          <Link href="/" className="text-blue-400 hover:underline text-sm">
            ← Volver
          </Link>
          <a
            href="/api/export"
            className="bg-zinc-800 hover:bg-zinc-700 rounded px-4 py-2 text-sm transition cursor-pointer"
          >
            Descargar CSV
          </a>
        </nav>

        <header>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-zinc-400 text-sm">
            Resumen de tus boletas y las de demostración.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI
            label="Total gastado"
            value={formatMoney(stats.totalSpent, stats.currency)}
          />
          <KPI label="Boletas" value={stats.count.toString()} />
          <KPI
            label="Promedio"
            value={formatMoney(stats.avg, stats.currency)}
          />
          <KPI label="Top proveedor" value={stats.topVendor ?? "—"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded p-4">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-3">
              Gasto por proveedor
            </h2>
            <VendorPieChart data={vendorData} />
          </div>
          <div className="bg-zinc-900 rounded p-4">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-3">
              Gasto por mes
            </h2>
            <MonthlyBarChart data={monthlyData} />
          </div>
        </div>
      </div>
    </main>
  )
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 rounded p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">
        {label}
      </div>
      <div
        className="text-lg font-medium mt-1 truncate"
        title={value}
      >
        {value}
      </div>
    </div>
  )
}

function formatMoney(value: number, currency: string): string {
  return `${currency} ${value.toFixed(2)}`
}

function computeStats(receipts: Receipt[]) {
  const totalSpent = receipts.reduce((sum, r) => sum + (r.total ?? 0), 0)
  const count = receipts.length
  const avg = count > 0 ? totalSpent / count : 0
  const currency = receipts[0]?.currency ?? "PEN"

  const vendorTotals = new Map<string, number>()
  for (const r of receipts) {
    if (!r.vendorName || r.total == null) continue
    vendorTotals.set(
      r.vendorName,
      (vendorTotals.get(r.vendorName) ?? 0) + r.total,
    )
  }
  let topVendor: string | null = null
  let topAmount = 0
  for (const [name, amount] of vendorTotals) {
    if (amount > topAmount) {
      topAmount = amount
      topVendor = name
    }
  }

  return { totalSpent, count, avg, currency, topVendor }
}

function computeMonthly(receipts: Receipt[]) {
  const months = new Map<string, number>()
  for (const r of receipts) {
    if (!r.issueDate || r.total == null) continue
    const key = `${r.issueDate.getFullYear()}-${String(
      r.issueDate.getMonth() + 1,
    ).padStart(2, "0")}`
    months.set(key, (months.get(key) ?? 0) + r.total)
  }

  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, total]) => ({
      month,
      total: Math.round(total * 100) / 100,
    }))
}

function computeVendors(receipts: Receipt[]) {
  const map = new Map<string, number>()
  for (const r of receipts) {
    if (!r.vendorName || r.total == null) continue
    map.set(r.vendorName, (map.get(r.vendorName) ?? 0) + r.total)
  }

  const sorted = [...map.entries()]
    .map(([name, total]) => ({
      name,
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => b.total - a.total)

  const top = sorted.slice(0, 5)
  const restTotal = sorted.slice(5).reduce((s, v) => s + v.total, 0)
  if (restTotal > 0) {
    top.push({ name: "Otros", total: Math.round(restTotal * 100) / 100 })
  }
  return top
}
