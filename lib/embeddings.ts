/**
 * Voyage AI embeddings wrapper.
 *
 * Why Voyage over alternatives: their free-tier limit is generous
 * (200M tokens lifetime) and their multilingual models are strong for
 * Peruvian Spanish receipt text. Latency is ~100ms p50 from Lima.
 *
 * We pull only the embedding endpoint via fetch — no SDK — to keep the
 * dep footprint flat and the failure surface small (one network call,
 * one shape to validate).
 *
 * The `input_type` parameter is what gives Voyage its edge: passing
 * "document" when embedding a receipt and "query" when embedding a
 * user search lets the model produce asymmetric embeddings in the same
 * space, which materially improves retrieval over symmetric encoders.
 */

// No `server-only` guard: this module is also imported by CLI scripts
// (scripts/backfill-embeddings.ts) which run outside any RSC context.
// API-key safety is guaranteed by Next never exposing non-`NEXT_PUBLIC_*`
// env vars to the browser bundle, not by this import marker.

const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3.5-lite";

/** Dimensions of `voyage-3.5-lite`. Must match `vector(N)` in the DB. */
export const EMBEDDING_DIMENSIONS = 1024;

export type EmbeddingInputType = "document" | "query";

interface VoyageResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

interface VoyageError {
  detail?: string;
  error?: string;
}

function getApiKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) {
    throw new Error(
      "VOYAGE_API_KEY env var is required for embeddings. " +
        "Sign up free at https://voyageai.com and set the key in .env.",
    );
  }
  return key;
}

/**
 * Compact text representation of a receipt for embedding.
 *
 * Encodes vendor, document type/number, and item descriptions in a flat
 * "label: value" form with bilingual labels (Proveedor / Vendor, Tipo /
 * Type). The bilingual labels boost recall when the user query uses
 * either Spanish or English terminology — at the cost of a few extra
 * tokens per receipt, which is negligible for retrieval and well under
 * Voyage's per-input limit.
 *
 * Deterministic: the same receipt always produces the same string, so
 * the same embedding (modulo model updates).
 */
export function buildReceiptText(receipt: {
  vendorName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  items?: unknown;
}): string {
  const parts: string[] = [];
  if (receipt.vendorName) {
    parts.push(`Proveedor / Vendor: ${receipt.vendorName}`);
  }
  if (receipt.documentType) {
    parts.push(`Tipo / Type: ${receipt.documentType}`);
  }
  if (receipt.documentNumber) {
    parts.push(`Documento / Document: ${receipt.documentNumber}`);
  }
  const items = extractItemDescriptions(receipt.items);
  if (items.length > 0) {
    parts.push(`Ítems / Items: ${items.join(", ")}`);
  }
  // Fallback: even a bare-vendor receipt should embed to something.
  return parts.join(" || ") || "(empty receipt)";
}

function extractItemDescriptions(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const desc =
          typeof obj.description === "string" ? obj.description : null;
        return desc?.trim() ?? null;
      }
      return null;
    })
    .filter((desc): desc is string => desc !== null && desc.length > 0);
}

/**
 * Embed a batch of texts. Returns embeddings in the same order as inputs.
 * Throws on Voyage API errors (caller decides whether to surface or swallow).
 */
export async function embedTexts(
  texts: string[],
  inputType: EmbeddingInputType,
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const res = await fetch(VOYAGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as VoyageError;
    const reason = body.detail ?? body.error ?? res.statusText;
    throw new Error(`Voyage ${res.status}: ${reason}`);
  }

  const json = (await res.json()) as VoyageResponse;
  // Voyage returns items in the request order but sorts by `index` to be safe.
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

/** Convenience: embed a single text. */
export async function embedText(
  text: string,
  inputType: EmbeddingInputType,
): Promise<number[]> {
  const [vec] = await embedTexts([text], inputType);
  return vec;
}

/** Convenience: embed a single receipt as a document. */
export async function embedReceipt(receipt: {
  vendorName?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  items?: unknown;
}): Promise<number[]> {
  return embedText(buildReceiptText(receipt), "document");
}

/**
 * Format a number[] as a pgvector literal: `[0.1,0.2,...]`.
 * Used for raw SQL inserts/updates since the Prisma client treats
 * `vector(N)` as opaque (Unsupported) and won't bind arrays directly.
 */
export function toPgvectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
