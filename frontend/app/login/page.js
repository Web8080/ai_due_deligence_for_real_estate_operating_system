"use client";
// Author: Victor.I

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { fetchJson, getApiBase, getStoredAuth, storeAuth } from "../lib/reos-client";

export default function LoginPage() {
  const API = getApiBase();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [recoveryEnabled, setRecoveryEnabled] = useState(true);
  const [signupEnabled, setSignupEnabled] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.token) {
      router.replace("/app");
      return;
    }
    fetchJson(`${API}/auth/providers`)
      .then((payload) => {
        setRecoveryEnabled(Boolean(payload.local_recovery_enabled));
        setSignupEnabled(Boolean(payload.local_signup_enabled));
        setDemoMode(Boolean(payload.product_demo_mode));
        setMessage("");
      })
      .catch(() => {
        setMessage(
          "Cannot reach auth service. Start the API on port 8000 and restart Next (proxy /api/reos). See docs/run-local.md."
        );
      });
  }, [API, router]);

  async function onLogin(e) {
    e.preventDefault();
    setMessage("");
    setBusy("local");
    try {
      const data = await fetchJson(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      storeAuth({ username: data.username || username, role: data.role, token: data.token, provider: data.provider });
      router.push("/app");
    } catch (error) {
      const msg = error?.message || "Login failed";
      setMessage(
        msg === "Failed to fetch" || (msg && msg.startsWith("Failed to fetch"))
          ? "Backend unreachable. Start the API on port 8000, set REOS_LOCAL_LOGIN_ENABLED=true in backend/.env, restart Next (uses /api/reos proxy)."
          : msg
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-stage">
        <div className="auth-copy">
          <p className="section-eyebrow">REOS</p>
          <h1>Sign in to the workspace.</h1>
          <p>
            Use your username and password to access the operating environment for deals, diligence, investor coordination,
            and workflow control.
          </p>
        </div>

        <div className="auth-panel">
          <p className="section-eyebrow">Sign in</p>
          <h2>Username and password</h2>
          {!recoveryEnabled ? (
            <p className="muted-copy">Local sign-in is disabled on this environment. Contact your administrator.</p>
          ) : null}
          <form className="stack-form" onSubmit={onLogin}>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              required
            />
            <button type="submit" disabled={busy === "local"}>
              {busy === "local" ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {message ? <p className="inline-alert alert-error">{message}</p> : null}
          {demoMode ? (
            <p className="demo-mode-banner">
              Demo posture: integration catalog and AI run locally or with your own keys. No vendor traffic until you configure
              connectors.
            </p>
          ) : null}

          <p className="back-link">
            {signupEnabled ? (
              <Link href="/signup">Create sandbox account</Link>
            ) : (
              <Link href="/signup">Access setup notes</Link>
            )}
            {" · "}
            <Link href="/">Back to overview</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
