"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold">Algo salió mal</h1>
        <p className="text-zinc-400 text-sm">
          {error.message || "Error desconocido"}
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-600 font-mono">ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 text-sm font-medium transition cursor-pointer"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="bg-zinc-800 hover:bg-zinc-700 rounded px-4 py-2 text-sm font-medium transition"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  )
}
