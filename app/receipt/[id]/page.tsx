import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionId, DEMO_SESSION_ID } from "@/lib/session";
import { CopyableField } from "@/components/CopyableField";
import { RawExtractionViewer } from "@/components/RawExtractionViewer";
import { getDict } from "@/lib/i18n";

type Item = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type ReceiptPageProps = {
  params: Promise<{ id: string }>;
};

async function loadReceipt(id: string) {
  const sessionId = await getSessionId();
  const visibleSessions = sessionId
    ? [sessionId, DEMO_SESSION_ID]
    : [DEMO_SESSION_ID];

  return prisma.receipt.findFirst({
    where: {
      id,
      sessionId: { in: visibleSessions },
      imageMimeType: { not: "image/synthetic" },
    },
  });
}

export async function generateMetadata({
  params,
}: ReceiptPageProps): Promise<Metadata> {
  const { id } = await params;
  const receipt = await loadReceipt(id);
  const t = await getDict();
  if (!receipt) return { title: t.meta.receiptNotFound };
  return {
    title: receipt.vendorName ?? t.meta.receiptNoVendor,
    description:
      `${receipt.documentType ?? ""} ${receipt.documentNumber ?? ""}`.trim(),
  };
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { id } = await params;
  const receipt = await loadReceipt(id);
  if (!receipt) notFound();

  const t = await getDict();
  const copyLabels = {
    copy: t.receipt.copy,
    copied: t.receipt.copied,
    copyAria: t.receipt.copyAria,
  };
  const rawLabels = {
    summary: t.receipt.rawSummary,
    copy: t.receipt.copyJson,
    copied: t.receipt.copiedJson,
  };
  const items = (receipt.items as Item[] | null) ?? [];
  const imageDataUri = `data:${receipt.imageMimeType};base64,${Buffer.from(
    receipt.imageData,
  ).toString("base64")}`;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/" className="text-blue-400 hover:underline text-sm">
          {t.nav.back}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded p-4">
            <h2 className="text-xs uppercase text-zinc-500 mb-2 tracking-wide">
              {t.receipt.originalImage}
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageDataUri} alt="Receipt" className="w-full rounded" />
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-900 rounded p-4 space-y-2">
              <h2 className="text-xs uppercase text-zinc-500 tracking-wide">
                {t.receipt.extractedData}
              </h2>
              <CopyableField
                label={t.receipt.fieldVendor}
                value={receipt.vendorName}
                labels={copyLabels}
              />
              <CopyableField
                label={t.receipt.fieldRuc}
                value={receipt.vendorRuc}
                labels={copyLabels}
              />
              <CopyableField
                label={t.receipt.fieldDocument}
                value={
                  [receipt.documentType, receipt.documentNumber]
                    .filter(Boolean)
                    .join(" ") || null
                }
                labels={copyLabels}
              />
              <CopyableField
                label={t.receipt.fieldDate}
                value={receipt.issueDate?.toLocaleDateString() ?? null}
                labels={copyLabels}
              />

              <div className="grid grid-cols-3 gap-2 pt-3">
                <MoneyBox
                  label={t.receipt.boxSubtotal}
                  value={receipt.subtotal}
                  currency={receipt.currency}
                />
                <MoneyBox
                  label={t.receipt.boxIgv}
                  value={receipt.igv}
                  currency={receipt.currency}
                />
                <MoneyBox
                  label={t.receipt.boxTotal}
                  value={receipt.total}
                  currency={receipt.currency}
                  highlight
                />
              </div>
              <div className="flex items-center gap-2 pt-3">
                <span className="text-xs px-2 py-0.5 rounded bg-green-900/30 text-green-300 border border-green-800/50">
                  ⚡ {receipt.extractionMs} ms
                </span>
                <span className="text-xs text-zinc-500">
                  {t.receipt.poweredBy}
                </span>
              </div>
            </div>

            {items.length > 0 && (
              <div className="bg-zinc-900 rounded p-4">
                <h2 className="text-xs uppercase text-zinc-500 mb-2 tracking-wide">
                  {t.receipt.itemsTitle}
                </h2>
                <table className="w-full text-sm">
                  <thead className="text-zinc-500 text-xs">
                    <tr>
                      <th className="text-left pb-2">
                        {t.receipt.tableDescription}
                      </th>
                      <th className="text-right pb-2">
                        {t.receipt.tableQuantity}
                      </th>
                      <th className="text-right pb-2">
                        {t.receipt.tableUnitPrice}
                      </th>
                      <th className="text-right pb-2">
                        {t.receipt.tableTotal}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className="border-t border-zinc-800">
                        <td className="py-1.5">{it.description}</td>
                        <td className="text-right">{it.quantity}</td>
                        <td className="text-right">
                          {it.unitPrice?.toFixed(2)}
                        </td>
                        <td className="text-right">{it.total?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <RawExtractionViewer
              data={receipt.rawExtraction}
              labels={rawLabels}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function MoneyBox({
  label,
  value,
  currency,
  highlight,
}: {
  label: string;
  value: unknown;
  currency: string;
  highlight?: boolean;
}) {
  const numeric = value != null ? Number(value) : null;
  return (
    <div
      className={`rounded p-2 ${
        highlight ? "bg-blue-900/30 border border-blue-700" : "bg-zinc-800"
      }`}
    >
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-sm font-medium">
        {numeric != null ? `${currency} ${numeric.toFixed(2)}` : "—"}
      </div>
    </div>
  );
}
