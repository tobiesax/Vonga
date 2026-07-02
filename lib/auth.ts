import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isSupabaseConfigured, merchantSlug } from "./supabase/config";
import { createSupabaseServerClient } from "./supabase/server";

export const SESSION_COOKIE = "cc_merchant_session";
const sessionPayload = "crunch-and-crumbs:merchant";

function secret() {
  return process.env.AUTH_SECRET || "local-development-secret-change-before-deploying";
}

export function sessionToken() {
  return createHmac("sha256", secret()).update(sessionPayload).digest("hex");
}

export function validPassword(input: string) {
  const expected = Buffer.from(process.env.DASHBOARD_PASSWORD || "admin123");
  const provided = Buffer.from(input);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export async function isAuthenticated() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from("merchant_members").select("merchant_id,merchants!inner(slug)").eq("user_id", user.id).eq("merchants.slug", merchantSlug()).maybeSingle();
    return Boolean(data);
  }
  const supplied = (await cookies()).get(SESSION_COOKIE)?.value;
  const expected = sessionToken();
  if (!supplied || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
