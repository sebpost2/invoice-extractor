"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parse as parsePartialJson, Allow } from "partial-json";
import type { Dict } from "@/lib/i18n";

type PartialReceipt = {
  vendorName?: string | null;
  vendorRuc?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  issueDate?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  igv?: number | null;
  total?: number | null;
  items?: Array<{
    description?: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;
};

type Status = "idle" | "uploading" | "extracting" | "done" | "error";

type UploaderTranslations = Dict["uploader"];

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
  );
}

function stripCodeFences(s: string): string {
  return s.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
}

function Field({
  label,
  value,
  isStreaming,
}: {
  label: string;
  value: string | null | undefined;
  isStreaming: boolean;
}) {
  const hasValue = value !== undefined && value !== null && value !== "";
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
  );
}

export function StreamingUploader({
  translations: t,
}: {
  translations: UploaderTranslations;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [partial, setPartial] = useState<PartialReceipt>({});
  const [error, setError] = useState<string | null>(null);

  const SAMPLES = [
    {
      path: "/samples/boleta-1.jpg",
      mimeType: "image/jpeg",
      label: t.samples.manuscrita.label,
      description: t.samples.manuscrita.description,
    },
    {
      path: "/samples/boleta-2.webp",
      mimeType: "image/webp",
      label: t.samples.servicio.label,
      description: t.samples.servicio.description,
    },
    {
      path: "/samples/boleta-4.png",
      mimeType: "image/png",
      label: t.samples.factura.label,
      description: t.samples.factura.description,
    },
  ] as const;

  const isProcessing = status === "uploading" || status === "extracting";

  async function extract(file: File) {
    setStatus("uploading");
    setError(null);
    setPartial({});

    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const receiptId = response.headers.get("x-receipt-id");
      if (!receiptId) throw new Error(t.errMissingHeader);

      const reader = response.body?.getReader();
      if (!reader) throw new Error(t.errStreamRead);

      setStatus("extracting");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const candidate = stripCodeFences(buffer).trim();
        if (!candidate.startsWith("{")) continue;

        try {
          const obj = parsePartialJson(candidate, Allow.ALL) as PartialReceipt;
          setPartial(obj);
        } catch {
          // ignore intermediate parse errors — next chunk fixes them
        }
      }

      setStatus("done");
      router.push(`/receipt/${receiptId}`);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError(err instanceof Error ? err.message : t.errUnknown);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("receipt");
    if (!(file instanceof File) || file.size === 0) return;
    await extract(file);
  }

  async function handleSample(sample: (typeof SAMPLES)[number]) {
    if (isProcessing) return;
    try {
      const res = await fetch(sample.path);
      if (!res.ok) throw new Error(`${t.errCantLoadSample} ${sample.path}`);
      const blob = await res.blob();
      const filename = sample.path.split("/").pop() ?? "sample";
      const file = new File([blob], filename, { type: sample.mimeType });
      await extract(file);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : t.errSampleLoad);
    }
  }

  const items = partial.items ?? [];

  return (
    <div className="space-y-4">
      <form
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
              <span>{t.uploading}</span>
            </>
          )}
          {status === "extracting" && (
            <>
              <Spinner />
              <span>{t.extracting}</span>
            </>
          )}
          {(status === "idle" || status === "done" || status === "error") && (
            <span>{t.extract}</span>
          )}
        </button>
        <p className="text-xs text-zinc-500">{t.fileHint}</p>
      </form>

      <div className="space-y-2">
        <p className="text-xs text-zinc-500 text-center">{t.samplesPrompt}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SAMPLES.map((sample) => (
            <button
              key={sample.path}
              type="button"
              onClick={() => handleSample(sample)}
              disabled={isProcessing}
              className="group bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg p-3 text-left transition flex items-center gap-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sample.path}
                alt={sample.label}
                className="w-14 h-14 object-cover rounded shrink-0 border border-zinc-800"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-200 group-hover:text-blue-400 transition">
                  {sample.label} →
                </div>
                <div className="text-xs text-zinc-500 truncate">
                  {sample.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 rounded p-3 text-sm">
          {error}
        </div>
      )}

      {(status === "extracting" ||
        (status === "done" && Object.keys(partial).length > 0)) && (
        <div className="bg-zinc-900 rounded p-4 space-y-3 border border-zinc-800">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>{t.liveExtraction}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Field
              label={t.fieldVendor}
              value={partial.vendorName}
              isStreaming
            />
            <Field
              label={t.fieldRuc}
              value={partial.vendorRuc}
              isStreaming
            />
            <Field
              label={t.fieldType}
              value={partial.documentType}
              isStreaming
            />
            <Field
              label={t.fieldDocument}
              value={partial.documentNumber}
              isStreaming
            />
            <Field
              label={t.fieldDate}
              value={partial.issueDate}
              isStreaming
            />
            <Field
              label={t.fieldTotal}
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
                {t.itemsDetected} ({items.length})
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
  );
}
