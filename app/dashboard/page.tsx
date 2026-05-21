import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { getSessionId, DEMO_SESSION_ID } from "@/lib/session"
import { MonthlyBarChart, VendorPieChart } from "@/components/Charts"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Resumen de boletas extraídas: KPIs, gráficos y export CSV.",
}

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
    where: {
      sessionId: { in: visibleSessions },
      imageMimeType: { not: "image/synthetic" },
    },
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

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const thisMonthReceipts = receipts.filter(
    (r) => r.issueDate && r.issueDate >= thisMonthStart,
  )
  const lastMonthReceipts = receipts.filter(
    (r) =>
      r.issueDate &&
      r.issueDate >= lastMonthStart &&
      r.issueDate <= lastMonthEnd,
  )

  const allTime = computeStats(receipts)
  const thisMonth = computeStats(thisMonthReceipts)
  const lastMonth = computeStats(lastMonthReceipts)

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

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-sm font-medium text-blue-100 uppercase tracking-wide">
            Total extraído (este mes)
          </p>
          <p className="text-4xl md:text-5xl font-bold mt-2">
            {formatMoney(thisMonth.totalSpent, thisMonth.currency)}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-sm text-blue-100">
              {thisMonth.count} boleta(s) este mes
            </p>
            <ChangeBadge
              current={thisMonth.totalSpent}
              previous={lastMonth.totalSpent}
              suffix="vs mes anterior"
              variant="onAccent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KPI label="Total histórico" primary={formatMoney(allTime.totalSpent, allTime.currency)} />
          <KPI
            label="Promedio por boleta"
            primary={formatMoney(allTime.avg, allTime.currency)}
            secondary={`${allTime.count} boletas en total`}
          />
          <KPI
            label="Top proveedor"
            primary={allTime.topVendor ?? "—"}
            secondary={
              allTime.topVendor
                ? formatMoney(allTime.topVendorAmount, allTime.currency)
                : undefined
            }
          />
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

function ChangeBadge({
  current,
  previous,
  suffix,
  variant = "default",
}: {
  current: number
  previous: number
  suffix: string
  variant?: "default" | "onAccent"
}) {
  if (previous === 0 && current === 0) return null
  if (previous === 0) {
    return (
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded ${
          variant === "onAccent"
            ? "bg-white/20 text-white"
            : "bg-zinc-800 text-zinc-400"
        }`}
      >
        Nuevo {suffix}
      </span>
    )
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  const isUp = pct > 0
  const colorClass =
    variant === "onAccent"
      ? isUp
        ? "bg-white/20 text-white"
        : "bg-white/20 text-white"
      : isUp
        ? "bg-green-900/40 text-green-300"
        : "bg-red-900/40 text-red-300"
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded ${colorClass}`}
    >
      {isUp ? "▲" : "▼"} {Math.abs(pct)}% {suffix}
    </span>
  )
}

function KPI({
  label,
  primary,
  secondary,
}: {
  label: string
  primary: string
  secondary?: string
}) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">
        {label}
      </div>
      <div
        className="text-xl font-semibold mt-1 truncate"
        title={primary}
      >
        {primary}
      </div>
      {secondary && (
        <div className="text-xs text-zinc-500 mt-1 truncate">{secondary}</div>
      )}
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
  let topVendorAmount = 0
  for (const [name, amount] of vendorTotals) {
    if (amount > topVendorAmount) {
      topVendorAmount = amount
      topVendor = name
    }
  }

  return { totalSpent, count, avg, currency, topVendor, topVendorAmount }
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
