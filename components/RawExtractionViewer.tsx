"use client";

import { useState } from "react";

type Labels = {
  summary: string;
  copy: string;
  copied: string;
};

export function RawExtractionViewer({
  data,
  labels,
}: {
  data: unknown;
  labels?: Labels;
}) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);
  const l: Labels = labels ?? {
    summary: "View raw LLM response",
    copy: "📋 Copy JSON",
    copied: "✓ Copied",
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <details className="bg-zinc-900 rounded border border-zinc-800 group">
      <summary className="text-xs uppercase tracking-wide text-zinc-500 p-3 cursor-pointer hover:text-zinc-300 transition list-none flex justify-between items-center">
        <span>
          <span className="inline-block mr-2 transition-transform group-open:rotate-90">
            ▶
          </span>
          {l.summary}
        </span>
      </summary>
      <div className="border-t border-zinc-800">
        <div className="flex justify-end px-3 py-2">
          <button
            type="button"
            onClick={copy}
            className="text-xs text-zinc-500 hover:text-blue-400 cursor-pointer"
          >
            {copied ? l.copied : l.copy}
          </button>
        </div>
        <pre className="text-xs text-zinc-300 px-3 pb-3 overflow-x-auto font-mono leading-relaxed">
          {json}
        </pre>
      </div>
    </details>
  );
}
