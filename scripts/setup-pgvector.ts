/**
 * One-time database setup for the semantic-search feature.
 *
 * Idempotent — safe to re-run. Does three things in order:
 *   1. Enable the pgvector extension on the database (CREATE EXTENSION).
 *   2. Add the embedding column to Receipt if Prisma's `db push` hasn't
 *      already done so (handles fresh checkouts).
 *   3. Create the HNSW index on the embedding column for fast cosine
 *      similarity queries.
 *
 * Run with:
 *   npx tsx scripts/setup-pgvector.ts
 *
 * Pre-req: DATABASE_URL set in .env (Neon free tier supports pgvector
 * out of the box; no special branch needed).
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("→ enabling pgvector extension...");
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`);

  console.log('→ ensuring Receipt.embedding column exists (vector(1024))...');
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Receipt" ADD COLUMN IF NOT EXISTS "embedding" vector(1024)`,
  );

  console.log("→ creating HNSW index (cosine ops) on Receipt.embedding...");
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "receipt_embedding_idx" ON "Receipt" USING hnsw (embedding vector_cosine_ops)`,
  );

  console.log("✓ pgvector ready. Next: npx tsx scripts/backfill-embeddings.ts");
}

main()
  .catch((err) => {
    console.error("setup-pgvector failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
