"use client";
// Author: Victor.I

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "./auth-provider";
import OllamaChatPanel from "./ollama-chat-panel";
import { getApiBase } from "../lib/reos-client";

const NAV_GROUPS = [
  {
    label: "Portfolio",
    items: [
      { href: "/app", label: "Overview" },
      { href: "/app/reports", label: "Committee Queue" },
      { href: "/app/capital-stack", label: "Capital stack" },
    ],
  },
  {
    label: "Deals",
    items: [
      { href: "/app/deals", label: "All Deals" },
      { href: "/app/leads", label: "Intake" },
    ],
  },
  {
    label: "CRM",
    items: [{ href: "/app/crm", label: "Contacts & Companies" }],
  },
  {
    label: "Investors",
    items: [{ href: "/app/investors", label: "Pipeline & Onboarding" }],
  },
  {
    label: "AI & Documents",
    items: [
      { href: "/app/documents", label: "Document Library" },
      { href: "/app/import", label: "Imports" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/app/operations", label: "Workflow" },
      { href: "/app/strategy", label: "Automation rollout" },
      { href: "/app/integrations", label: "Integrations" },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/app/governance", label: "Controls & Audit" },
      { href: "/app/admin", label: "Admin" },
    ],
  },
];

const TOP_NAV = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/deals", label: "Properties" },
  { href: "/app/leads", label: "Leads" },
  { href: "/app/capital-stack", label: "Cap stack" },
  { href: "/app/reports", label: "Analytics" },
  { href: "/app/integrations", label: "Integrations" },
];

function isRouteActive(pathname, href) {
  if (!pathname || !href) return false;
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function pickActiveGroup(pathname, groups) {
  let bestLen = -1;
  let bestGroup = groups[0] || { items: [] };
  for (const group of groups) {
    for (const item of group.items) {
      if (!isRouteActive(pathname, item.href)) continue;
      if (item.href.length > bestLen) {
        bestLen = item.href.length;
        bestGroup = group;
      }
    }
  }
  return bestGroup;
}

export default function EnterpriseShell({ children }) {
  const pathname = usePathname();
  const { auth, loading, logout } = useAuth();
  const role = auth?.role || "analyst";
  const isDashboardHome = pathname === "/app";
  const hideSideChat = pathname === "/app" || pathname === "/app/strategy";
  const [apiHealth, setApiHealth] = useState("pending");

  useEffect(() => {
    const base = getApiBase();
    let cancelled = false;
    async function ping() {
      try {
        const r = await fetch(`${base}/health`, { cache: "no-store" });
        if (cancelled) return;
        setApiHealth(r.ok ? "ok" : "warn");
      } catch {
        if (!cancelled) setApiHealth("down");
      }
    }
    ping();
    const id = setInterval(ping, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.filter((group) => {
        if (group.label === "Governance") return role === "admin" || role === "manager";
        return true;
      }).map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.href === "/app/admin") return role === "admin";
          if (item.href === "/app/governance") return role === "admin" || role === "manager";
          return true;
        }),
      })),
    [role]
  );

  const activeGroup = useMemo(() => pickActiveGroup(pathname, visibleGroups), [pathname, visibleGroups]);

  if (loading) {
    return (
      <main className="enterprise-loading">
        <div className="loading-panel">
          <p className="section-eyebrow">REOS Enterprise</p>
          <h1>Loading workspace</h1>
        </div>
      </main>
    );
  }

  return (
    <div className={`enterprise-shell ${isDashboardHome ? "enterprise-shell-dashboard" : ""}`}>
      <aside className="enterprise-sidebar">
        <Link href="/" className="sidebar-brand">
          <span className="brand-mark">R</span>
          <div>
            <strong>REOS</strong>
            <span>Enterprise Operating System</span>
          </div>
        </Link>
        <nav className="sidebar-nav">
          {visibleGroups.map((group) => (
            <div key={group.label} className="sidebar-group">
              <p>{group.label}</p>
              {group.items.map((item) => {
                const active = isRouteActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} className={active ? "nav-item nav-item-active" : "nav-item"}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <div className="enterprise-main">
        <header className="enterprise-header dashboard-topbar">
          <Link href="/app" className="dashboard-logo">
            <span className="dashboard-logo-icon" aria-hidden />
            <span>REAL ESTATE</span>
          </Link>
          <nav className="dashboard-topnav">
            {TOP_NAV.map((item) => {
              const active = isRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "dashboard-topnav-link active" : "dashboard-topnav-link"}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="dashboard-user">
            <span className="api-health-strip" title="API reachability (vendor connectors are separate)">
              <span
                className={`api-health-dot${apiHealth === "ok" ? " ok" : ""}${apiHealth === "warn" ? " warn" : ""}${
                  apiHealth === "down" ? " down" : ""
                }`}
              />
              {apiHealth === "down" ? "API offline" : "API"}
            </span>
            <span className="dashboard-username">{auth?.username || "User"}</span>
            <button type="button" className="ghost-button dashboard-logout" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>
        <div className="subnav-row">
          {activeGroup.items.map((item) => {
            const active = isRouteActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "subnav-pill subnav-pill-active" : "subnav-pill"}>
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className={`enterprise-content ${hideSideChat ? "" : "enterprise-content-with-chat"}`}>
          {children}
          {!hideSideChat ? <OllamaChatPanel /> : null}
        </div>
      </div>
    </div>
  );
}
