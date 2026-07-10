"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LANG_COOKIE, type Lang } from "@/lib/i18n-lang"

const strings: Record<Lang, { title: string; unknown: string; retry: string; home: string }> = {
  en: { title: "Something went wrong", unknown: "Unknown error", retry: "Retry", home: "Go home" },
  es: { title: "Algo salió mal", unknown: "Error desconocido", retry: "Reintentar", home: "Ir al inicio" },
}

function readLangCookie(): Lang {
  if (typeof document === "undefined") return "en"
  const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=(en|es)`))
  return (match?.[1] as Lang) ?? "en"
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [lang] = useState(readLangCookie)
  const t = strings[lang]

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-zinc-400 text-sm">
          {error.message || t.unknown}
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-600 font-mono">ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 text-sm font-medium transition cursor-pointer"
          >
            {t.retry}
          </button>
          <Link
            href="/"
            className="bg-zinc-800 hover:bg-zinc-700 rounded px-4 py-2 text-sm font-medium transition"
          >
            {t.home}
          </Link>
        </div>
      </div>
    </main>
  )
}
