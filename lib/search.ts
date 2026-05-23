/**
 * Semantic search over receipts via pgvector + Voyage embeddings.
 *
 * Pipeline (single query, single row trip):
 *   1. Embed the user's query as a "query"-type vector (Voyage's asymmetric
 *      mode boosts retrieval against "document"-type receipt embeddings).
 *   2. Run a raw SQL with `embedding <=> $1::vector` (cosine distance).
 *      pgvector's HNSW index makes this O(log n).
 *   3. Return the top N rows scoped to the user's session + the demo set,
 *      with `1 - distance` as the similarity score (so higher = better).
 *
 * Returned shape is a thin projection — vendor, total, date, similarity —
 * meant for a list view, not detail pages.
 */

// No `server-only` guard: see note in lib/embeddings.ts. This module is
// only ever called from server-side code (route handlers, scripts) — but
// scripts run outside RSC so the `server-only` package would throw.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { embedText, toPgvectorLiteral } from "./embeddings";
import { DEMO_SESSION_ID } from "./session";

export interface SearchHit {
  id: string;
  sessionId: string;
  vendorName: string | null;
  vendorRuc: string | null;
  documentType: string | null;
  issueDate: Date | null;
  currency: string;
  total: number | null;
  similarity: number; // 0..1; higher is better
}

interface SearchRow {
  id: string;
  sessionId: string;
  vendorName: string | null;
  vendorRuc: string | null;
  documentType: string | null;
  issueDate: Date | null;
  currency: string;
  total: Prisma.Decimal | null;
  similarity: number;
}

export const DEFAULT_SEARCH_LIMIT = 5;

export async function searchReceipts(
  query: string,
  ownSessionId: string | null,
  limit: number = DEFAULT_SEARCH_LIMIT,
): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queryEmbedding = await embedText(trimmed, "query");
  const literal = toPgvectorLiteral(queryEmbedding);

  // Scope: always include demo receipts so first-time visitors get results
  // without needing to upload their own first.
  const sessionIds = ownSessionId
    ? [ownSessionId, DEMO_SESSION_ID]
    : [DEMO_SESSION_ID];

  // Raw SQL because the `embedding` column is Unsupported in Prisma's schema
  // and pgvector operators (`<=>`) don't exist in the Prisma query builder.
  const rows = await prisma.$queryRaw<SearchRow[]>`
    SELECT
      id,
      "sessionId",
      "vendorName",
      "vendorRuc",
      "documentType",
      "issueDate",
      currency,
      total,
      1 - (embedding <=> ${literal}::vector) AS similarity
    FROM "Receipt"
    WHERE embedding IS NOT NULL
      AND "sessionId" = ANY(${sessionIds}::text[])
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    vendorName: r.vendorName,
    vendorRuc: r.vendorRuc,
    documentType: r.documentType,
    issueDate: r.issueDate,
    currency: r.currency,
    total: r.total != null ? Number(r.total) : null,
    similarity: Number(r.similarity),
  }));
}
