/**
 * In-memory sliding-window rate limiter, keyed by session id (or IP as a
 * fallback for first-time visitors who don't have a session cookie yet).
 *
 * ponytail: state lives in a process-local Map — it resets on cold start
 * and isn't shared across serverless instances/regions, so it's a soft
 * throttle, not a hard guarantee. Upgrade to Upstash/Redis if abuse of
 * the paid Groq/Voyage calls becomes a real problem.
 */
const hits = new Map<string, number[]>();

export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  hits.set(key, timestamps);
  return timestamps.length > limit;
}
