"use client";

import Link from "next/link";

export default function AppShell({ title, subtitle, username, role, onLogout, children }) {
  return (
    <main className="container dashboard-shell">
      <div className="heading-row">
        <div>
          <p className="eyebrow">REOS Workspace</p>
          <h1 className="title">{title}</h1>
          {subtitle ? <p className="hero-copy workspace-copy">{subtitle}</p> : null}
        </div>
        <p className="role-pill">
          {username || "user"} · {role || "member"}
        </p>
      </div>

      <div className="workspace-nav">
        <Link href="/app" className="button-link button-secondary">
          Command Center
        </Link>
        <Link href="/app/integrations" className="button-link button-secondary">
          Integrations
        </Link>
        <Link href="/app/import" className="button-link button-secondary">
          Import
        </Link>
        <Link href="/" className="button-link button-secondary">
          Landing
        </Link>
        <button onClick={onLogout}>Logout</button>
      </div>

      {children}
    </main>
  );
}
