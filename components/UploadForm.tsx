"use client"

import { useFormStatus } from "react-dom"
import { uploadReceipt } from "@/app/actions/upload"

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

function FormBody() {
  const { pending } = useFormStatus()

  return (
    <div
      className={`border-2 border-dashed border-zinc-700 rounded-lg p-8 space-y-4 bg-zinc-900 transition-opacity ${
        pending ? "opacity-60 pointer-events-none" : ""
      }`}
    >
      <input
        type="file"
        name="receipt"
        accept="image/jpeg,image/png,image/webp"
        required
        disabled={pending}
        className="block w-full text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer cursor-pointer disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 rounded py-2 font-medium transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
      >
        {pending ? (
          <>
            <Spinner />
            <span>Extrayendo datos con IA...</span>
          </>
        ) : (
          "Extraer datos"
        )}
      </button>
      <p className="text-xs text-zinc-500">JPG, PNG o WEBP. Máximo 4 MB.</p>
    </div>
  )
}

export function UploadForm() {
  return (
    <form action={uploadReceipt}>
      <FormBody />
    </form>
  )
}
