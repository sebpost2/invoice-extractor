"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { parse as parsePartialJson, Allow } from "partial-json"

type PartialReceipt = {
  vendorName?: string | null
  vendorRuc?: string | null
  documentType?: string | null
  documentNumber?: string | null
  issueDate?: string | null
  currency?: string | null
  subtotal?: number | null
  igv?: number | null
  total?: number | null
  items?: Array<{
    description?: string
    quantity?: number
    unitPrice?: number
    total?: number
  }>
}

type Status = "idle" | "uploading" | "extracting" | "done" | "error"

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}

function stripCodeFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "")
}

function Field({
  label,
  value,
  isStreaming,
}: {
  label: string
  value: string | null | undefined
  isStreaming: boolean
}) {
  const hasValue = value !== undefined && value !== null && value !== ""
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      {hasValue ? (
        <div className="text-sm mt-1 truncate font-medium text-zinc-100">
          {value}
        </div>
      ) : isStreaming ? (
        <div className="h-5 mt-1 bg-zinc-800 rounded animate-pulse" />
      ) : (
        <div className="text-sm mt-1 text-zinc-600">—</div>
      )}
    </div>
  )
}

export function StreamingUploader() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>("idle")
  const [partial, setPartial] = useState<PartialReceipt>({})
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    setStatus("uploading")
    setError(null)
    setPartial({})

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }

      const receiptId = response.headers.get("x-receipt-id")
      if (!receiptId) throw new Error("Falta x-receipt-id en la respuesta")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No se pudo leer el stream")

      setStatus("extracting")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const candidate = stripCodeFences(buffer).trim()
        if (!candidate.startsWith("{")) continue

        try {
          const obj = parsePartialJson(candidate, Allow.ALL) as PartialReceipt
          setPartial(obj)
        } catch {
          // ignorar errores de parsing intermedios — el siguiente chunk los resuelve
        }
      }

      setStatus("done")
      router.push(`/receipt/${receiptId}`)
    } catch (err) {
      console.error(err)
      setStatus("error")
      setError(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  const isProcessing = status === "uploading" || status === "extracting"
  const items = partial.items ?? []

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`border-2 border-dashed border-zinc-700 rounded-lg p-8 space-y-4 bg-zinc-900 transition-opacity ${
          isProcessing ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <input
          type="file"
          name="receipt"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={isProcessing}
          className="block w-full text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer cursor-pointer disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 rounded py-2 font-medium transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {status === "uploading" && (
            <>
              <Spinner />
              <span>Subiendo imagen...</span>
            </>
          )}
          {status === "extracting" && (
            <>
              <Spinner />
              <span>Extrayendo con IA en vivo...</span>
            </>
          )}
          {(status === "idle" || status === "done" || status === "error") && (
            <span>Extraer datos</span>
          )}
        </button>
        <p className="text-xs text-zinc-500">JPG, PNG o WEBP. Máximo 4 MB.</p>
      </form>

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {(status === "extracting" || (status === "done" && Object.keys(partial).length > 0)) && (
        <div className="bg-zinc-900 rounded p-4 space-y-3 border border-zinc-800">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Extracción en vivo</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Field
              label="Proveedor"
              value={partial.vendorName}
              isStreaming
            />
            <Field
              label="RUC"
              value={partial.vendorRuc}
              isStreaming
            />
            <Field
              label="Tipo"
              value={partial.documentType}
              isStreaming
            />
            <Field
              label="Documento"
              value={partial.documentNumber}
              isStreaming
            />
            <Field
              label="Fecha"
              value={partial.issueDate}
              isStreaming
            />
            <Field
              label="Total"
              value={
                partial.total != null
                  ? `${partial.currency ?? "PEN"} ${partial.total}`
                  : null
              }
              isStreaming
            />
          </div>

          {items.length > 0 && (
            <div className="pt-2">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                Ítems detectados ({items.length})
              </div>
              <ul className="space-y-1">
                {items.map((it, i) => (
                  <li
                    key={i}
                    className="text-xs text-zinc-300 flex justify-between bg-zinc-950 border border-zinc-800 rounded px-2 py-1"
                  >
                    <span className="truncate">
                      {it.description ?? "..."}
                    </span>
                    <span className="text-zinc-500 ml-2 shrink-0">
                      {it.quantity ?? "?"} × {it.unitPrice ?? "?"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
