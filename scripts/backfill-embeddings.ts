/**
 * Backfill semantic-search embeddings for receipts.
 *
 * Run with:
 *   npx tsx scripts/backfill-embeddings.ts          # only rows with NULL embedding
 *   npx tsx scripts/backfill-embeddings.ts --force  # re-embed every row
 *
 * Idempotent — without `--force`, only touches `embedding IS NULL` rows, so
 * safe to re-run after a partial failure or after adding more receipts via
 * the seed script. Pass `--force` after changing `buildReceiptText` (or the
 * embedding model) to refresh every row. Batches inputs through Voyage in
 * groups of 64 (within their per-request limit) and prints progress.
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";
import {
  buildReceiptText,
  embedTexts,
  toPgvectorLiteral,
} from "../lib/embeddings";

const BATCH_SIZE = 64;
const FORCE = process.argv.includes("--force");

interface PendingRow {
  id: string;
  vendorName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  items: unknown;
}

async function fetchPending(): Promise<PendingRow[]> {
  // The `embedding` column is Unsupported in Prisma's schema, so use raw SQL
  // to filter by it. We need the same fields buildReceiptText reads.
  if (FORCE) {
    return prisma.$queryRaw<PendingRow[]>`
      SELECT id, "vendorName", "documentType", "documentNumber", items
      FROM "Receipt"
      ORDER BY "createdAt" ASC
    `;
  }
  return prisma.$queryRaw<PendingRow[]>`
    SELECT id, "vendorName", "documentType", "documentNumber", items
    FROM "Receipt"
    WHERE embedding IS NULL
    ORDER BY "createdAt" ASC
  `;
}

async function main() {
  const pending = await fetchPending();
  if (pending.length === 0) {
    console.log("✓ no receipts pending — all embeddings up to date.");
    return;
  }

  const mode = FORCE ? "re-embedding all" : "embedding pending";
  console.log(`→ ${pending.length} receipts (${mode}). Batches of ${BATCH_SIZE}...`);

  let done = 0;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) =>
      buildReceiptText({
        vendorName: r.vendorName,
        documentType: r.documentType,
        documentNumber: r.documentNumber,
        items: r.items,
      }),
    );

    const vectors = await embedTexts(texts, "document");

    // Update each row with its embedding. We do these sequentially (small
    // batches, transactional clarity > throughput) — for a portfolio dataset
    // this is more than fast enough.
    for (let j = 0; j < batch.length; j++) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Receipt" SET "embedding" = $1::vector WHERE id = $2`,
        toPgvectorLiteral(vectors[j]),
        batch[j].id,
      );
    }

    done += batch.length;
    console.log(`  · ${done}/${pending.length}`);
  }

  console.log(`✓ backfilled ${done} embeddings.`);
}

main()
  .catch((err) => {
    console.error("backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
