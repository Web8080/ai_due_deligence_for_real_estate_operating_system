"use client";
// Author: Victor.I
// Local signup only when the API exposes it; avoids fake success on 409/403 from the server.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchJson, getApiBase, getStoredAuth } from "../lib/reos-client";

export default function SignupPage() {
  const API = getApiBase();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [signupOpen, setSignupOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const existing = getStoredAuth();
    if (existing?.token) {
      router.replace("/app");
      return;
    }
    fetchJson(`${API}/auth/providers`)
      .then((payload) => {
        setSignupOpen(Boolean(payload.local_signup_enabled));
        setMessage("");
      })
      .catch(() => setMessage("Cannot reach auth service. Start the backend on port 8000."));
  }, [API, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setMessage("");
    setSuccess("");
    setBusy(true);
    try {
      const body = await fetchJson(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim() || undefined,
          password,
          display_name: displayName.trim() || undefined,
        }),
      });
      setSuccess(body.message || "Account created. Sign in with your new credentials.");
      setUsername("");
      setEmail("");
      setPassword("");
      setDisplayName("");
    } catch (err) {
      setMessage(err?.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-stage auth-stage-wide">
        <div className="auth-copy">
          <p className="section-eyebrow">REOS</p>
          <h1>Create a sandbox account</h1>
          <p>
            When enabled on the API, signup creates an analyst user locally. Microsoft Entra remains the enterprise path when
            configured.
          </p>
        </div>

        <div className="auth-panel">
          {!signupOpen ? (
            <>
              <h2>Signup is off by default</h2>
              <p className="muted-copy">
                Set <code>REOS_ALLOW_LOCAL_SIGNUP=true</code> alongside local login on the backend. Default operators continue to
                use bootstrap users (see backend/.env.example).
              </p>
              <p className="back-link">
                <Link href="/login">Back to sign in</Link>
              </p>
            </>
          ) : (
            <>
              <p className="section-eyebrow">New user</p>
              <h2>Register</h2>
              <form className="stack-form" onSubmit={onSubmit}>
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required minLength={3} />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name (optional)"
                />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min 10 characters)"
                  type="password"
                  required
                  minLength={10}
                />
                <button type="submit" disabled={busy}>
                  {busy ? "Creating..." : "Create account"}
                </button>
              </form>
              {success ? <p className="inline-alert alert-success">{success}</p> : null}
              {message ? <p className="inline-alert alert-error">{message}</p> : null}
              <p className="back-link">
                <Link href="/login">Already have access? Sign in</Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
