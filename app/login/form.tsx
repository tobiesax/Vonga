"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ production }: { production: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setError(data.error ?? "Sign-in failed.");
    router.replace("/dashboard"); router.refresh();
  }
  return <form className="loginForm" onSubmit={login}>{production && <><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="username" required autoFocus/></>}<label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required autoFocus={!production}/>{error && <p className="loginError">{error}</p>}<button className="primary" disabled={busy}>{busy ? "SIGNING IN…" : "SIGN IN"}</button></form>;
}
