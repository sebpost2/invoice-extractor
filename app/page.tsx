import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StreamingUploader } from "@/components/StreamingUploader";
import { getSessionId, DEMO_SESSION_ID } from "@/lib/session";
import { getDict } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return {
    title: t.meta.homeTitle,
    description: t.meta.homeDescription,
  };
}

export default async function HomePage() {
  const sessionId = await getSessionId();
  const t = await getDict();
  const visibleSessions = sessionId
    ? [sessionId, DEMO_SESSION_ID]
    : [DEMO_SESSION_ID];

  const receipts = await prisma.receipt.findMany({
    where: {
      sessionId: { in: visibleSessions },
      imageMimeType: { not: "image/synthetic" },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      sessionId: true,
      vendorName: true,
      total: true,
      currency: true,
      issueDate: true,
      documentType: true,
      createdAt: true,
    },
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex justify-between items-start gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{t.home.title}</h1>
            <p className="text-zinc-400">{t.home.subtitle}</p>
          </div>
          <Link
            href="/dashboard"
            className="bg-zinc-800 hover:bg-zinc-700 rounded px-4 py-2 text-sm transition shrink-0"
          >
            {t.nav.dashboard} →
          </Link>
        </header>

        <StreamingUploader translations={t.uploader} />

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t.home.recent}</h2>
          {receipts.length === 0 ? (
            <p className="text-zinc-500 text-sm">{t.home.empty}</p>
          ) : (
            <ul className="space-y-2">
              {receipts.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/receipt/${r.id}`}
                    className="block bg-zinc-900 hover:bg-zinc-800 rounded p-4 transition"
                  >
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-medium flex items-center gap-2 min-w-0">
                        <span className="truncate">
                          {r.vendorName ?? t.home.unknownVendor}
                        </span>
                        {r.sessionId === DEMO_SESSION_ID && (
                          <span className="text-[10px] uppercase tracking-wider bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded shrink-0">
                            {t.home.demo}
                          </span>
                        )}
                      </span>
                      <span className="text-blue-400 shrink-0">
                        {r.total
                          ? `${r.currency} ${Number(r.total).toFixed(2)}`
                          : "—"}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 flex gap-3 mt-1">
                      <span>{r.documentType ?? "—"}</span>
                      {r.issueDate && (
                        <span>{new Date(r.issueDate).toLocaleDateString()}</span>
                      )}
                      <span>
                        {t.home.uploaded}{" "}
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
