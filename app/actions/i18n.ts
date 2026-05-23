"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Lang } from "@/lib/i18n";
import { LANG_COOKIE } from "@/lib/i18n";

export async function setLangAction(lang: Lang) {
  const c = await cookies();
  c.set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
