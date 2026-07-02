import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/dashboard");
  return <main className="loginPage"><section className="loginCard"><img src="/assets/logo.png" alt="Crunch & Crumbs"/><p className="eyebrow">MERCHANT PORTAL</p><h1>Welcome back</h1><p>Sign in to manage orders, customers and automations.</p><LoginForm production={isSupabaseConfigured()}/><a href="/">← Return to storefront</a></section></main>;
}
