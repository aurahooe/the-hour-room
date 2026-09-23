"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase";

export default function Login() {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("in");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created. If email confirm is on, check your inbox — otherwise go to the desk.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/desk";
      }
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <nav className="nav">
        <Link className="mark" href="/">The <em>Hour</em> Room</Link>
        <div className="nav-links">
          <Link href="/">Street</Link>
        </div>
      </nav>
      <div className="auth-card">
        <div className="kicker">{mode === "in" ? "Return" : "Join"}</div>
        <h1 style={{ fontSize: 42, margin: "8px 0 18px" }}>
          {mode === "in" ? "Sign in" : "Make a desk"}
        </h1>
        <form className="form" onSubmit={submit}>
          <input
            type="email"
            required
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="password (8+)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
          <div className="row">
            <button className="btn" disabled={busy} type="submit">
              {busy ? "Working…" : mode === "in" ? "Enter" : "Create account"}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => setMode(mode === "in" ? "up" : "in")}
            >
              {mode === "in" ? "Need a desk?" : "Already have one?"}
            </button>
          </div>
        </form>
        {msg && <p className="meta" style={{ marginTop: 16 }}>{msg}</p>}
      </div>
    </div>
  );
}
