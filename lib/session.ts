import { cookies } from "next/headers"
import { randomUUID } from "crypto"

const COOKIE_NAME = "iex_session"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export const DEMO_SESSION_ID = "__demo__"

export async function getSessionId(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value ?? null
}

// Builds the raw Set-Cookie header value. Used instead of cookies().set()
// for routes returning a streaming Response, where Next.js does not
// reliably flush the mutable cookie store onto the outgoing headers.
export function buildSessionCookieHeader(sessionId: string): string {
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ONE_YEAR_SECONDS}`
}

export async function ensureSessionId(): Promise<{
  sessionId: string
  isNew: boolean
}> {
  const store = await cookies()
  const existing = store.get(COOKIE_NAME)?.value
  if (existing) return { sessionId: existing, isNew: false }

  const newId = randomUUID()
  store.set(COOKIE_NAME, newId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  })
  return { sessionId: newId, isNew: true }
}
