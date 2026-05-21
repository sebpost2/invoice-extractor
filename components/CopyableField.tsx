"use client"

import { useState } from "react"

export function CopyableField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // navigator.clipboard puede fallar en contextos no-secure; ignorar
    }
  }

  const display = value || "—"
  const canCopy = Boolean(value)

  return (
    <div className="flex justify-between items-center text-sm group gap-2">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate" title={display}>
          {display}
        </span>
        {canCopy && (
          <button
            type="button"
            onClick={copy}
            className="text-xs text-zinc-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition cursor-pointer shrink-0 px-1"
            title={copied ? "Copiado" : "Copiar"}
            aria-label="Copiar al portapapeles"
          >
            {copied ? "✓" : "📋"}
          </button>
        )}
      </div>
    </div>
  )
}
