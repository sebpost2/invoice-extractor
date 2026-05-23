/**
 * POST /api/search
 * Body: { query: string, limit?: number }
 * Returns: { hits: SearchHit[] }
 *
 * Scoped to the user's session cookie + the demo set. Returns 400 on
 * an empty query, 500 on Voyage errors (with the upstream message
 * surfaced for diagnosability — this is a dev-friendly demo, not a
 * hardened public API).
 */

import { NextResponse } from "next/server";
import { getSessionId } from "@/lib/session";
import { searchReceipts, DEFAULT_SEARCH_LIMIT } from "@/lib/search";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;
  const query = typeof obj.query === "string" ? obj.query.trim() : "";
  if (!query) {
    return NextResponse.json(
      { error: "query is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  const limit =
    typeof obj.limit === "number" && Number.isInteger(obj.limit) && obj.limit > 0
      ? Math.min(obj.limit, 20)
      : DEFAULT_SEARCH_LIMIT;

  try {
    const sessionId = await getSessionId();
    const hits = await searchReceipts(query, sessionId, limit);
    return NextResponse.json({ hits });
  } catch (err) {
    console.error("[/api/search] failed:", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
