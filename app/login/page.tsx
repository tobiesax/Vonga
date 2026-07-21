import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import LoginForm from "./form";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/dashboard");
  return <main className="loginPage"><div className="loginCard">
    <img src="/vonga/logo/vonga-logo.png" alt="VONGA"/>
    <p className="eyebrow">Merchant sign in</p>
    <h1>Welcome back</h1>
    <p>Sign in to manage Vonga orders, customers and automations.</p>
    <LoginForm production={isSupabaseConfigured()}/>
  </div></main>;
}
