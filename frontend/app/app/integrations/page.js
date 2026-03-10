"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "../../components/app-shell";
import { authHeaders, clearStoredAuth, getApiBase, getStoredAuth } from "../../lib/reos-client";

function summarizeCounts(items) {
  return {
    total: items.length,
    connected: items.filter((item) => item.connected).length,
    enabled: items.filter((item) => item.enabled).length,
    placeholders: items.filter((item) => item.placeholder).length,
    readyForApi: items.filter((item) => item.api_ready).length,
  };
}

export default function IntegrationsPage() {
  const API = getApiBase();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

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

  async function loadCatalog(currentToken) {
    const tokenToUse = currentToken || token;
    if (!tokenToUse) return;
    try {
      const response = await fetch(`${API}/integrations/catalog`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.detail || "Could not load integrations.");
        return;
      }
      setCatalog(payload.items || []);
      if (!selectedKey && payload.items?.length) {
        setSelectedKey(payload.items[0].key);
      }
    } catch {
      setMessage("Could not load integrations.");
    }
  }

  useEffect(() => {
    if (token) loadCatalog(token);
  }, [token]);

  async function toggleIntegration(item) {
    setBusy(item.key);
    try {
      const response = await fetch(`${API}/integrations/catalog/toggle`, {
        method: "POST",
        headers,
        body: JSON.stringify({ key: item.key, enabled: !item.enabled }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.detail || "Could not update integration.");
        return;
      }
      setMessage(
        item.placeholder
          ? `${item.label} is now ${payload.enabled ? "enabled" : "disabled"} for placeholder UI testing.`
          : `${item.label} is now ${payload.enabled ? "enabled" : "disabled"}.`
      );
      await loadCatalog();
    } finally {
      setBusy("");
    }
  }

  function previewIntegration(item) {
    setSelectedKey(item.key);
    setMessage(item.last_test_result);
  }

  function logout() {
    clearStoredAuth();
    router.push("/login");
  }

  const categories = useMemo(() => {
    const unique = Array.from(new Set(catalog.map((item) => item.category)));
    return ["all", ...unique];
  }, [catalog]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return catalog;
    return catalog.filter((item) => item.category === categoryFilter);
  }, [catalog, categoryFilter]);

  const liveItems = filteredItems.filter((item) => !item.placeholder);
  const placeholderItems = filteredItems.filter((item) => item.placeholder);
  const selectedIntegration =
    filteredItems.find((item) => item.key === selectedKey) || filteredItems[0] || catalog.find((item) => item.key === selectedKey);
  const counts = summarizeCounts(catalog);

  return (
    <AppShell
      title="Integrations"
      subtitle="Control live integration readiness, preview future API connections, and expose the configuration shape needed for testing before external services are ready."
      username={username}
      role={role}
      onLogout={logout}
    >
      {message ? <p className="message">{message}</p> : null}

      <div className="stats-row">
        <div className="stat-card">
          <span>Total</span>
          <strong>{counts.total}</strong>
        </div>
        <div className="stat-card">
          <span>Connected</span>
          <strong>{counts.connected}</strong>
        </div>
        <div className="stat-card">
          <span>Enabled</span>
          <strong>{counts.enabled}</strong>
        </div>
        <div className="stat-card">
          <span>Placeholders</span>
          <strong>{counts.placeholders}</strong>
        </div>
      </div>

      <section className="card wide-card">
        <div className="integration-toolbar">
          <div>
            <h2>Integration Overview</h2>
            <p className="muted-line">
              Filter by capability area and inspect both live-backed and future placeholder integrations.
            </p>
          </div>
          <div className="integration-filter-row">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => loadCatalog()} disabled={busy === "refresh"}>
              Refresh
            </button>
          </div>
        </div>
        <div className="integration-chip-row">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`chip-button ${categoryFilter === category ? "chip-active" : ""}`}
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="integration-layout">
        <div className="integration-column">
          <div className="card">
            <h2>Live and Configurable</h2>
            <div className="integration-list">
              {liveItems.length === 0 ? (
                <p>No live integrations match the current filter.</p>
              ) : (
                liveItems.map((item) => (
                  <article
                    key={item.key}
                    className={`integration-card ${selectedIntegration?.key === item.key ? "integration-selected" : ""}`}
                  >
                    <div className="integration-card-head">
                      <div>
                        <h3>{item.label}</h3>
                        <p className="muted-line">{item.summary}</p>
                      </div>
                      <span className={`integration-badge badge-${item.status}`}>{item.status}</span>
                    </div>
                    <div className="integration-meta">
                      <span>{item.category}</span>
                      <span>{item.auth_type}</span>
                      <span>{item.api_ready ? "API-ready" : "Not API-ready"}</span>
                    </div>
                    <div className="integration-actions-row">
                      <button type="button" className="button-secondary integration-action" onClick={() => previewIntegration(item)}>
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleIntegration(item)}
                        disabled={busy === item.key}
                        className={item.enabled ? "integration-toggle-on" : "integration-toggle-off"}
                      >
                        {busy === item.key ? "Saving..." : item.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h2>Planned and Placeholder</h2>
            <div className="integration-list">
              {placeholderItems.length === 0 ? (
                <p>No placeholder integrations match the current filter.</p>
              ) : (
                placeholderItems.map((item) => (
                  <article
                    key={item.key}
                    className={`integration-card ${selectedIntegration?.key === item.key ? "integration-selected" : ""}`}
                  >
                    <div className="integration-card-head">
                      <div>
                        <h3>{item.label}</h3>
                        <p className="muted-line">{item.summary}</p>
                      </div>
                      <span className="integration-badge badge-placeholder">placeholder</span>
                    </div>
                    <div className="integration-meta">
                      <span>{item.category}</span>
                      <span>{item.auth_type}</span>
                      <span>{item.enabled ? "mock enabled" : "mock disabled"}</span>
                    </div>
                    <div className="integration-actions-row">
                      <button type="button" className="button-secondary integration-action" onClick={() => previewIntegration(item)}>
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleIntegration(item)}
                        disabled={busy === item.key}
                        className={item.enabled ? "integration-toggle-on" : "integration-toggle-off"}
                      >
                        {busy === item.key ? "Saving..." : item.enabled ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="card integration-detail-card">
          <h2>Integration Detail</h2>
          {!selectedIntegration ? (
            <p>Select an integration to inspect configuration shape and testing notes.</p>
          ) : (
            <>
              <div className="integration-detail-head">
                <div>
                  <h3>{selectedIntegration.label}</h3>
                  <p className="muted-line">{selectedIntegration.summary}</p>
                </div>
                <span className={`integration-badge ${selectedIntegration.placeholder ? "badge-placeholder" : `badge-${selectedIntegration.status}`}`}>
                  {selectedIntegration.placeholder ? "placeholder" : selectedIntegration.status}
                </span>
              </div>

              <ul className="list">
                <li>Category: {selectedIntegration.category}</li>
                <li>Auth type: {selectedIntegration.auth_type}</li>
                <li>Mode: {selectedIntegration.mode}</li>
                <li>Connected: {selectedIntegration.connected ? "Yes" : "No"}</li>
                <li>Enabled: {selectedIntegration.enabled ? "Yes" : "No"}</li>
                <li>API ready: {selectedIntegration.api_ready ? "Yes" : "No"}</li>
              </ul>

              <h3>Config Fields</h3>
              <div className="workspace-table">
                {selectedIntegration.config_fields.map((field) => (
                  <div key={field.key} className="table-row-link static-row">
                    <strong>{field.label}</strong>
                    <span>
                      {field.key}
                      {field.secret ? " · secret" : ""}
                      {field.value_hint ? ` · ${field.value_hint}` : ""}
                    </span>
                  </div>
                ))}
              </div>

              <h3>Required Environment Variables</h3>
              <div className="integration-code-list">
                {selectedIntegration.required_env_vars.map((entry) => (
                  <code key={entry}>{entry}</code>
                ))}
              </div>

              <h3>Notes</h3>
              <ul className="list">
                {selectedIntegration.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>

              <h3>Testing Status</h3>
              <p className="muted-line">{selectedIntegration.last_test_result}</p>
            </>
          )}
        </aside>
      </section>
    </AppShell>
  );
}
