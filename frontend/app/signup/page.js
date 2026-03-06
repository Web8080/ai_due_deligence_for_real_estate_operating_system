"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:8000`;
  return "http://localhost:8000";
}

export default function SignupPage() {
  const API = getApiBase();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("analyst");
  const [agreePolicy, setAgreePolicy] = useState(false);
  const [message, setMessage] = useState("");

  async function onSignup(e) {
    e.preventDefault();
    setMessage("");
    if (password !== confirmPassword) {
      setMessage("Password confirmation does not match.");
      return;
    }
    if (!agreePolicy) {
      setMessage("You must accept the organization usage policy.");
      return;
    }
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.detail || "Signup failed");
      return;
    }
    setMessage(`User ${data.username} created. You can login now.`);
    setTimeout(() => router.push("/login"), 900);
  }

  return (
    <main className="container page-full">
      <section className="card auth-card auth-card-wide">
        <p className="eyebrow">Organization Onboarding</p>
        <h1 className="title">Create account</h1>
        <p className="hero-copy">Create a user identity for your team and start working in the REOS workspace.</p>
        <form className="stack-form" onSubmit={onSignup}>
          <div className="signup-form-grid">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" required />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" required />
            <input
              value={workEmail}
              onChange={(e) => {
                setWorkEmail(e.target.value);
                if (!username) {
                  const generated = e.target.value.split("@")[0] || "";
                  setUsername(generated.toLowerCase());
                }
              }}
              placeholder="Work email"
              type="email"
              required
            />
            <input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Organization name"
              required
            />
            <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department" required />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
          </div>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            required
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            type="password"
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="analyst">analyst</option>
            <option value="manager">manager</option>
            <option value="admin">admin</option>
          </select>
          <label className="checkbox-row">
            <input type="checkbox" checked={agreePolicy} onChange={(e) => setAgreePolicy(e.target.checked)} />
            <span>I confirm this user is authorized to access organization deal data.</span>
          </label>
          <button type="submit">Create Account</button>
        </form>
        {message && <p className="message">{message}</p>}
        <p className="back-link">
          <Link href="/login">Back to login</Link>
        </p>
      </section>
    </main>
  );
}
