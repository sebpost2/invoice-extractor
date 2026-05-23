"use client";

import { useTransition } from "react";
import { setLangAction } from "@/app/actions/i18n";
import type { Lang } from "@/lib/i18n";

type Props = { lang: Lang; aria: string };

export function LanguageToggle({ lang, aria }: Props) {
  const [pending, start] = useTransition();

  return (
    <div
      role="group"
      aria-label={aria}
      className="fixed right-4 top-4 z-50 inline-flex items-center gap-0.5 rounded-full border border-zinc-800 bg-zinc-900/80 p-0.5 text-xs font-medium backdrop-blur-md md:right-6 md:top-5"
    >
      {(["en", "es"] as const).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => start(() => setLangAction(l))}
            disabled={pending}
            aria-pressed={active}
            className={`rounded-full px-3 py-1 uppercase tracking-wide transition-colors disabled:opacity-60 ${
              active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
