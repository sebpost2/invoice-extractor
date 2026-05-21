import { cookies } from "next/headers"
import { randomUUID } from "crypto"

const COOKIE_NAME = "iex_session"
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export const DEMO_SESSION_ID = "__demo__"

export async function getSessionId(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value ?? null
}

export async function ensureSessionId(): Promise<string> {
  const store = await cookies()
  const existing = store.get(COOKIE_NAME)?.value
  if (existing) return existing

  const newId = randomUUID()
  store.set(COOKIE_NAME, newId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  })
  return newId
}
