import { defineConfig } from "vitest/config"
import { loadEnv } from "vite"

const env = loadEnv("", process.cwd(), "")

export default defineConfig({
  test: {
    // Modules under test import lib/groq.ts, which throws at load time if
    // GROQ_API_KEY is unset — same reason CI sets a dummy value (see
    // .github/workflows/ci.yml). Fall back to one here too so `npm run test`
    // works for anyone who hasn't pulled real secrets yet.
    env: {
      ...env,
      GROQ_API_KEY: env.GROQ_API_KEY || "test-dummy",
    },
  },
})
