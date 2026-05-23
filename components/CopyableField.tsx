"use client";

import { useState } from "react";

type Labels = {
  copy: string;
  copied: string;
  copyAria: string;
};

export function CopyableField({
  label,
  value,
  labels,
}: {
  label: string;
  value: string | null | undefined;
  labels?: Labels;
}) {
  const [copied, setCopied] = useState(false);
  const l: Labels = labels ?? {
    copy: "Copy",
    copied: "Copied",
    copyAria: "Copy to clipboard",
  };

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // navigator.clipboard may fail in non-secure contexts; ignore
    }
  }

  const display = value || "—";
  const canCopy = Boolean(value);

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
            title={copied ? l.copied : l.copy}
            aria-label={l.copyAria}
          >
            {copied ? "✓" : "📋"}
          </button>
        )}
      </div>
    </div>
  );
}
