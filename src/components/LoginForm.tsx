"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/server/auth";

export default function LoginForm({ mode, singleUserClosed }: { mode: "login" | "register"; singleUserClosed: boolean }) {
  const r = useRouter();
  const [err, setErr] = useState("");
  async function submit(f: FormData) {
    setErr("");
    try {
      if (mode === "login") await login(String(f.get("email")), String(f.get("password")));
      else await register({ email: String(f.get("email")), password: String(f.get("password")), displayName: String(f.get("displayName") || "Admin") });
      r.push("/");
      r.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    }
  }
  return (
    <div style={{ maxWidth: 380, margin: "60px auto", background: "#fff", padding: 24, borderRadius: 8 }}>
      <h1>{mode === "login" ? "Connexion" : "Créer le compte admin"}</h1>
      {mode === "register" && singleUserClosed && <p>Mode single-user : inscription fermée. Connectez-vous.</p>}
      <form action={submit} style={{ display: "grid", gap: 10 }}>
        {mode === "register" && <input name="displayName" placeholder="Nom affiché" required />}
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Mot de passe (8+)" minLength={8} required />
        <button type="submit">{mode === "login" ? "Se connecter" : "Créer"}</button>
      </form>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <p style={{ fontSize: 13 }}>
        {mode === "login" ? <a href="/login/register">Créer le compte</a> : <a href="/login">Se connecter</a>}
      </p>
    </div>
  );
}
