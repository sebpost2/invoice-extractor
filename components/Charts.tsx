"use client"

import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const COLORS = [
  "#3b82f6",
  "#a855f7",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#6b7280",
]

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: 6,
  fontSize: 12,
}

const TOOLTIP_LABEL_STYLE = {
  color: "#a1a1aa",
}

type MonthlyDatum = { month: string; total: number }
type VendorDatum = { name: string; total: number }

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-72 text-zinc-500 text-sm">
      {label}
    </div>
  )
}

export function MonthlyBarChart({ data }: { data: MonthlyDatum[] }) {
  if (data.length === 0) return <EmptyChart label="Sin fechas legibles aún" />

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
        <YAxis stroke="#71717a" fontSize={11} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          cursor={{ fill: "#27272a" }}
        />
        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function VendorPieChart({ data }: { data: VendorDatum[] }) {
  if (data.length === 0) return <EmptyChart label="Sin proveedores aún" />

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => Number(value).toFixed(2)}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value) => (
            <span style={{ color: "#d4d4d8" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
