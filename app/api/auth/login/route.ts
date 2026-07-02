import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken, validPassword } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json() as { email?: string; password?: string };
  if (isSupabaseConfigured()) {
    if (!body.email || !body.password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password });
    return error ? NextResponse.json({ error: "Incorrect email or password." }, { status: 401 }) : NextResponse.json({ ok: true });
  }
  if (!body.password || !validPassword(body.password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return response;
}
