"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import AppShell from "../components/app-shell";
import { authHeaders, clearStoredAuth, getApiBase, getStoredAuth } from "../lib/reos-client";

export default function AppPage() {
  const API = getApiBase();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [bootstrap, setBootstrap] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [newDealName, setNewDealName] = useState("");
  const [newDealCity, setNewDealCity] = useState("");
  const [newDealAssetType, setNewDealAssetType] = useState("multifamily");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactCompany, setNewContactCompany] = useState("");
  const [newContactType, setNewContactType] = useState("investor");
  const [integrationStatus, setIntegrationStatus] = useState(null);
  const [automation, setAutomation] = useState({ recommendations: [], challenges: [] });

  const headers = useMemo(() => authHeaders(token), [token]);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      router.push("/login");
      return;
    }
    setToken(auth.token);
    setRole(auth.role || "member");
    setUsername(auth.username || "");
  }, [router]);

  async function loadWorkspace(currentToken) {
    const tokenToUse = currentToken || token;
    if (!tokenToUse) return;
    const authHeader = { Authorization: `Bearer ${tokenToUse}` };
    try {
      const [workspaceRes, statusRes, automationRes] = await Promise.all([
        fetch(`${API}/workspace/bootstrap`, { headers: authHeader }),
        fetch(`${API}/integrations/status`, { headers: authHeader }),
        fetch(`${API}/automation/recommendations`, { headers: authHeader }),
      ]);
      if (workspaceRes.ok) setBootstrap(await workspaceRes.json());
      if (statusRes.ok) setIntegrationStatus(await statusRes.json());
      if (automationRes.ok) setAutomation(await automationRes.json());
    } catch {
      setMessage("Could not load workspace data.");
    }
  }

  useEffect(() => {
    if (token) loadWorkspace(token);
  }, [token]);

  async function seedDemo() {
    setBusy("seed");
    try {
      const res = await fetch(`${API}/demo/seed`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Could not seed local MVP data.");
        return;
      }
      setMessage(
        `Seeded ${data.deals_created} deals, ${data.contacts_created} contacts, and ${data.investor_pipeline_entries_created} investor records.`
      );
      await loadWorkspace();
    } finally {
      setBusy("");
    }
  }

  async function createDeal(e) {
    e.preventDefault();
    setBusy("deal");
    try {
      const res = await fetch(`${API}/deals`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newDealName,
          city: newDealCity,
          asset_type: newDealAssetType,
          priority: "high",
          next_action: "Review imported diligence and investor fit.",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Could not create deal.");
        return;
      }
      setNewDealName("");
      setNewDealCity("");
      setMessage(`Created deal ${data.name}.`);
      await loadWorkspace();
    } finally {
      setBusy("");
    }
  }

  async function createContact(e) {
    e.preventDefault();
    setBusy("contact");
    try {
      const res = await fetch(`${API}/crm/contacts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          full_name: newContactName,
          email: newContactEmail,
          contact_type: newContactType,
          company_name: newContactCompany,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Could not create contact.");
        return;
      }
      setNewContactName("");
      setNewContactEmail("");
      setNewContactCompany("");
      setMessage(`Created contact ${data.full_name}.`);
      await loadWorkspace();
    } finally {
      setBusy("");
    }
  }

  function logout() {
    clearStoredAuth();
    router.push("/login");
  }

  const analytics = bootstrap?.analytics || {
    total_deals: 0,
    total_contacts: 0,
    total_documents: 0,
    stage_distribution: {},
  };
  const deals = bootstrap?.deals || [];
  const contacts = bootstrap?.contacts || [];
  const investorPipeline = bootstrap?.investor_pipeline || [];
  const operations = bootstrap?.operations || { high_priority_items: [], overdue_like_items: [] };

  return (
    <AppShell
      title="Command Center"
      subtitle="Local MVP for deals, contacts, investor workflow, diligence operations, and spreadsheet-driven onboarding."
      username={username}
      role={role}
      onLogout={logout}
    >
      {message ? <p className="message">{message}</p> : null}

      <div className="stats-row">
        <div className="stat-card">
          <span>Deals</span>
          <strong>{analytics.total_deals}</strong>
        </div>
        <div className="stat-card">
          <span>Contacts</span>
          <strong>{analytics.total_contacts}</strong>
        </div>
        <div className="stat-card">
          <span>Documents</span>
          <strong>{analytics.total_documents}</strong>
        </div>
        <div className="stat-card">
          <span>Investor Signals</span>
          <strong>{investorPipeline.length}</strong>
        </div>
      </div>

      <section className="grid">
        <div className="card">
          <h2>Local MVP Controls</h2>
          <p className="muted-line">
            Seed demo data, import spreadsheets, and validate the workflows before real APIs are connected.
          </p>
          <div className="actions">
            <button onClick={seedDemo} disabled={busy === "seed"}>
              {busy === "seed" ? "Seeding..." : "Seed Demo Data"}
            </button>
            <button onClick={() => loadWorkspace()} disabled={busy === "refresh"}>
              Refresh Workspace
            </button>
            <Link href="/app/integrations" className="button-link button-secondary">
              Open Integrations
            </Link>
            <Link href="/app/import" className="button-link button-secondary">
              Open Import Center
            </Link>
          </div>
          {integrationStatus ? (
            <ul className="list">
              <li>Runtime mode: {integrationStatus.runtime_mode}</li>
              <li>AI provider: {integrationStatus.ai_provider}</li>
              <li>Automation mode: {integrationStatus.automation_mode}</li>
            </ul>
          ) : (
            <p>Integration state not loaded yet.</p>
          )}
        </div>

        <div className="card">
          <h2>Create Deal</h2>
          <form onSubmit={createDeal} className="stack-form">
            <input
              name="name"
              placeholder="Deal name"
              value={newDealName}
              onChange={(e) => setNewDealName(e.target.value)}
              required
            />
            <input
              name="city"
              placeholder="City"
              value={newDealCity}
              onChange={(e) => setNewDealCity(e.target.value)}
            />
            <select value={newDealAssetType} onChange={(e) => setNewDealAssetType(e.target.value)}>
              <option value="multifamily">multifamily</option>
              <option value="office">office</option>
              <option value="industrial">industrial</option>
              <option value="retail">retail</option>
              <option value="hospitality">hospitality</option>
            </select>
            <button type="submit" disabled={busy === "deal"}>
              {busy === "deal" ? "Creating..." : "Create Deal"}
            </button>
          </form>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Create Contact / Investor</h2>
          <form onSubmit={createContact} className="stack-form">
            <input
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              placeholder="Full name"
              required
            />
            <input
              value={newContactEmail}
              onChange={(e) => setNewContactEmail(e.target.value)}
              placeholder="Email"
              type="email"
            />
            <input
              value={newContactCompany}
              onChange={(e) => setNewContactCompany(e.target.value)}
              placeholder="Company name"
            />
            <select value={newContactType} onChange={(e) => setNewContactType(e.target.value)}>
              <option value="investor">investor</option>
              <option value="broker">broker</option>
              <option value="lender">lender</option>
              <option value="legal">legal</option>
            </select>
            <button type="submit" disabled={busy === "contact"}>
              {busy === "contact" ? "Creating..." : "Create Contact"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Operational Watchlist</h2>
          <h3>High Priority</h3>
          <ul className="list">
            {operations.high_priority_items.length === 0 ? (
              <li>No high priority items yet.</li>
            ) : (
              operations.high_priority_items.map((item) => <li key={item}>{item}</li>)
            )}
          </ul>
          <h3>Open Diligence</h3>
          <ul className="list">
            {operations.overdue_like_items.length === 0 ? (
              <li>No open diligence blockers.</li>
            ) : (
              operations.overdue_like_items.map((item) => <li key={item}>{item}</li>)
            )}
          </ul>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Active Deals</h2>
          <div className="workspace-table">
            {deals.map((deal) => (
              <Link key={deal.id} href={`/app/deals/${deal.id}`} className="table-row-link">
                <strong>{deal.name}</strong>
                <span>
                  {deal.asset_type || "asset"} · {deal.city || "unknown city"} · {deal.stage}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Contacts and Companies</h2>
          <div className="workspace-table">
            {contacts.slice(0, 18).map((contact) => (
              <div key={contact.id} className="table-row-link static-row">
                <strong>{contact.full_name}</strong>
                <span>
                  {contact.contact_type}
                  {contact.investor_type ? ` · ${contact.investor_type}` : ""}
                  {contact.email ? ` · ${contact.email}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Investor Pipeline</h2>
          <div className="workspace-table">
            {investorPipeline.length === 0 ? (
              <p>No investor pipeline records yet.</p>
            ) : (
              investorPipeline.slice(0, 18).map((item) => (
                <div key={item.id} className="table-row-link static-row">
                  <strong>{item.status}</strong>
                  <span>
                    Commitment ${Number(item.commitment_amount || 0).toLocaleString()} · {item.conviction}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2>Automation Priorities</h2>
          <ul className="list">
            {automation.recommendations.length === 0 ? (
              <li>No automation recommendations available.</li>
            ) : (
              automation.recommendations.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong> [{item.impact}/{item.effort}]
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
