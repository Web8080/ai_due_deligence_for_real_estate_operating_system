"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:8000`;
  return "http://localhost:8000";
}

export default function LoginPage() {
  const API = getApiBase();
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [message, setMessage] = useState("");

  async function onLogin(e) {
    e.preventDefault();
    setMessage("");
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.detail || "Login failed");
      return;
    }
    localStorage.setItem(
      "reos_auth",
      JSON.stringify({ username: data.username || username, role: data.role, token: data.token })
    );
    router.push("/app");
  }

  return (
    <main className="container page-full">
      <section className="card auth-card">
        <p className="eyebrow">Organization Access</p>
        <h1 className="title">Sign in to REOS</h1>
        <p className="hero-copy">
          Use an organization account to access deal workflow and AI due diligence.
        </p>
        <form className="stack-form" onSubmit={onLogin}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            required
          />
          <button type="submit">Login</button>
        </form>
        {message && <p className="message">{message}</p>}
        <div className="helper-box">
          <p>Sample users:</p>
          <ul className="list">
            <li>admin / admin123</li>
            <li>analyst1 / analyst123</li>
            <li>manager1 / manager123</li>
          </ul>
        </div>
        <p className="back-link">
          Need an account? <Link href="/signup">Create one</Link>
        </p>
        <p className="back-link">
          <Link href="/">Back to landing page</Link>
        </p>
      </section>
    </main>
  );
}
