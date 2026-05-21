"use client"

import { useState } from "react"

export function RawExtractionViewer({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(data, null, 2)

  async function copy() {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignorar errores de clipboard
    }
  }

  return (
    <details className="bg-zinc-900 rounded border border-zinc-800 group">
      <summary className="text-xs uppercase tracking-wide text-zinc-500 p-3 cursor-pointer hover:text-zinc-300 transition list-none flex justify-between items-center">
        <span>
          <span className="inline-block mr-2 transition-transform group-open:rotate-90">
            ▶
          </span>
          Ver respuesta cruda del LLM
        </span>
      </summary>
      <div className="border-t border-zinc-800">
        <div className="flex justify-end px-3 py-2">
          <button
            type="button"
            onClick={copy}
            className="text-xs text-zinc-500 hover:text-blue-400 cursor-pointer"
          >
            {copied ? "✓ Copiado" : "📋 Copiar JSON"}
          </button>
        </div>
        <pre className="text-xs text-zinc-300 px-3 pb-3 overflow-x-auto font-mono leading-relaxed">
          {json}
        </pre>
      </div>
    </details>
  )
}
