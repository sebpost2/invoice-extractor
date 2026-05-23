import type { Metadata } from "next";
import Link from "next/link";
import { getSessionId, DEMO_SESSION_ID } from "@/lib/session";
import { getDict } from "@/lib/i18n";
import { searchReceipts, type SearchHit } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return {
    title: t.meta.searchTitle,
    description: t.meta.searchDescription,
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const t = await getDict();
  const sessionId = await getSessionId();

  let hits: SearchHit[] = [];
  let errorMessage: string | null = null;
  if (query) {
    try {
      hits = await searchReceipts(query, sessionId);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "unknown error";
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex justify-between items-start gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{t.search.title}</h1>
            <p className="text-zinc-400 text-sm">{t.search.subtitle}</p>
          </div>
          <Link
            href="/"
            className="bg-zinc-800 hover:bg-zinc-700 rounded px-4 py-2 text-sm transition shrink-0"
          >
            {t.nav.back}
          </Link>
        </header>

        <form
          action="/search"
          method="get"
          className="flex gap-2"
          role="search"
        >
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t.search.placeholder}
            autoFocus
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-4 py-2 text-sm focus:outline-none focus:border-zinc-600"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 rounded px-4 py-2 text-sm font-medium transition"
          >
            {t.search.submit}
          </button>
        </form>

        {!query && (
          <p className="text-zinc-500 text-sm">{t.search.promptEmpty}</p>
        )}

        {errorMessage && (
          <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/60 rounded p-3">
            {errorMessage}
          </p>
        )}

        {query && !errorMessage && hits.length === 0 && (
          <p className="text-zinc-500 text-sm">{t.search.noResults(query)}</p>
        )}

        {hits.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wide text-zinc-500">
              {t.search.resultsHeader(hits.length, query)}
            </h2>
            <ul className="space-y-2">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={`/receipt/${hit.id}`}
                    className="block bg-zinc-900 hover:bg-zinc-800 rounded p-4 transition"
                  >
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-medium flex items-center gap-2 min-w-0">
                        <span className="truncate">
                          {hit.vendorName ?? t.home.unknownVendor}
                        </span>
                        {hit.sessionId === DEMO_SESSION_ID && (
                          <span className="text-[10px] uppercase tracking-wider bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded shrink-0">
                            {t.search.demoTag}
                          </span>
                        )}
                      </span>
                      <span className="text-blue-400 shrink-0">
                        {hit.total != null
                          ? `${hit.currency} ${hit.total.toFixed(2)}`
                          : "—"}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 flex gap-3 mt-1 flex-wrap">
                      <span>{hit.documentType ?? "—"}</span>
                      {hit.issueDate && (
                        <span>{new Date(hit.issueDate).toLocaleDateString()}</span>
                      )}
                      <span>
                        {t.search.similarityLabel}:{" "}
                        {(hit.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
