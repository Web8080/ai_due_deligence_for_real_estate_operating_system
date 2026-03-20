"use client";
// Author: Victor.I

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../components/auth-provider";
import MetricGrid from "../../components/metric-grid";
import PageFrame from "../../components/page-frame";
import { authHeaders, fetchJson, getApiBase } from "../../lib/reos-client";

function summarizeCounts(items) {
  return {
    total: items.length,
    connected: items.filter((item) => item.connected).length,
    enabled: items.filter((item) => item.enabled).length,
    placeholders: items.filter((item) => item.placeholder).length,
    readyForApi: items.filter((item) => item.api_ready).length,
  };
}

function IntegrationDetailPanel({ item }) {
  if (!item) {
    return (
      <div className="integration-detail-empty">
        <p className="integration-detail-empty-title">Select a connector</p>
        <p className="muted-copy">
          Choose an integration from the list to view its specification, required server variables, and rollout notes.
        </p>
      </div>
    );
  }

  return (
    <div className="integration-detail-body">
      <header className="integration-detail-hero">
        <div>
          <p className="integration-detail-eyebrow">Connector specification</p>
          <h2 className="integration-detail-title">{item.label}</h2>
          <p className="integration-detail-summary">{item.summary}</p>
        </div>
        <span className={`integration-badge ${item.placeholder ? "badge-placeholder" : `badge-${item.status}`}`}>
          {item.placeholder ? "Planned" : item.status.replace(/_/g, " ")}
        </span>
      </header>

      <p className="integration-detail-disclaimer">
        Parameters below describe what your platform team configures in the deployment environment. End users do not enter API keys
        or endpoints in this screen.
      </p>

      <section className="integration-detail-section">
        <h3 className="integration-detail-section-title">Posture</h3>
        <dl className="integration-spec-grid">
          <div className="integration-spec-cell">
            <dt>Category</dt>
            <dd>{item.category}</dd>
          </div>
          <div className="integration-spec-cell">
            <dt>Authentication</dt>
            <dd>{item.auth_type}</dd>
          </div>
          <div className="integration-spec-cell">
            <dt>Runtime mode</dt>
            <dd>{item.mode}</dd>
          </div>
          <div className="integration-spec-cell">
            <dt>Live connection</dt>
            <dd>{item.connected ? "Verified" : "Not verified"}</dd>
          </div>
          <div className="integration-spec-cell">
            <dt>Operator toggle</dt>
            <dd>{item.enabled ? "Enabled" : "Disabled"}</dd>
          </div>
          <div className="integration-spec-cell">
            <dt>API surface</dt>
            <dd>{item.api_ready ? "Ready to wire" : "Pending vendor access"}</dd>
          </div>
        </dl>
      </section>

      <section className="integration-detail-section">
        <h3 className="integration-detail-section-title">Connection parameters</h3>
        <p className="integration-detail-section-lead">
          Each row maps a deployment variable to its purpose. Secret values are never shown in the browser.
        </p>
        <ul className="integration-param-list">
          {item.config_fields.map((field) => (
            <li key={field.key} className="integration-param-card">
              <div className="integration-param-card-head">
                <span className="integration-param-label">{field.label}</span>
                {field.secret ? <span className="integration-param-badge">Secret</span> : null}
              </div>
              <div className="integration-param-meta">
                <span className="integration-param-var">{field.key}</span>
              </div>
              {field.value_hint ? <p className="integration-param-example">{field.value_hint}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="integration-detail-section">
        <h3 className="integration-detail-section-title">Server environment variables</h3>
        <p className="integration-detail-section-lead">
          Set these on the API host (or in your secret manager). Names are case-sensitive.
        </p>
        <div className="integration-env-table">
          {item.required_env_vars.map((name) => (
            <div key={name} className="integration-env-row">
              <code className="integration-env-name">{name}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="integration-detail-section">
        <h3 className="integration-detail-section-title">Guidance</h3>
        <ul className="integration-notes-list">
          {item.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="integration-detail-section integration-detail-section-muted">
        <h3 className="integration-detail-section-title">Last validation</h3>
        <p className="integration-validation-text">{item.last_test_result || "No validation run recorded."}</p>
      </section>
    </div>
  );
}

export default function IntegrationsPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const canMutate = auth?.role === "admin";
  const [catalog, setCatalog] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [demoNotice, setDemoNotice] = useState("");

  const headers = useMemo(() => authHeaders(auth?.token), [auth?.token]);

  async function loadCatalog(currentToken) {
    const tokenToUse = currentToken || auth?.token;
    if (!tokenToUse) return;
    try {
      const payload = await fetchJson(`${API}/integrations/catalog`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      setDemoNotice(payload.product_demo_mode && payload.demo_notice ? payload.demo_notice : "");
      setCatalog(payload.items || []);
      if (!selectedKey && payload.items?.length) {
        setSelectedKey(payload.items[0].key);
      }
    } catch (error) {
      setMessage(error.message || "Could not load integrations.");
    }
  }

  useEffect(() => {
    if (auth?.token) loadCatalog(auth.token);
  }, [auth?.token]);

  async function toggleIntegration(item) {
    setBusy(item.key);
    try {
      const payload = await fetchJson(`${API}/integrations/catalog/toggle`, {
        method: "POST",
        headers,
        body: JSON.stringify({ key: item.key, enabled: !item.enabled }),
      });
      setMessage(`${item.label} is now ${payload.enabled ? "enabled" : "disabled"}.`);
      await loadCatalog();
    } catch (error) {
      setMessage(error.message || "Could not update integration.");
    } finally {
      setBusy("");
    }
  }

  function previewIntegration(item) {
    setSelectedKey(item.key);
    setMessage(item.last_test_result);
  }

  const categories = useMemo(() => {
    const unique = Array.from(new Set(catalog.map((item) => item.category)));
    return ["all", ...unique];
  }, [catalog]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === "all") return catalog;
    return catalog.filter((item) => item.category === categoryFilter);
  }, [catalog, categoryFilter]);

  const activeItems = filteredItems.filter((item) => !item.placeholder);
  const plannedItems = filteredItems.filter((item) => item.placeholder);
  const selectedIntegration =
    filteredItems.find((item) => item.key === selectedKey) || filteredItems[0] || catalog.find((item) => item.key === selectedKey);
  const counts = summarizeCounts(catalog);

  return (
    <PageFrame
      eyebrow="Operations"
      title="Integrations & environment"
      subtitle="Review connector specifications and operator toggles. The top navigation “Settings” label refers to this control plane—not end-user profile preferences."
    >
      {demoNotice ? <p className="demo-mode-banner">{demoNotice}</p> : null}
      {message ? <p className="inline-alert">{message}</p> : null}
      {!canMutate ? (
        <p className="inline-alert">Only administrators can change enablement. All roles may read specifications.</p>
      ) : null}

      <MetricGrid
        items={[
          { label: "Catalog", value: counts.total, detail: "Connectors defined" },
          { label: "Verified", value: counts.connected, detail: "Health check passed" },
          { label: "Enabled", value: counts.enabled, detail: "In active posture" },
          { label: "Planned", value: counts.placeholders, detail: "Roadmap entries" },
        ]}
      />

      <section className="surface-card">
        <div className="integration-toolbar">
          <div>
            <h2 className="integration-panel-title">Catalog</h2>
            <p className="muted-copy">Filter by domain. Inspect specifications in the right panel.</p>
          </div>
          <div className="integration-filter-row">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category">
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All categories" : category}
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
              {category === "all" ? "All" : category}
            </button>
          ))}
        </div>
      </section>

      <section className="integration-layout">
        <div className="integration-column">
          <div className="surface-card">
            <h2 className="integration-panel-title">Active</h2>
            <div className="integration-list">
              {activeItems.length === 0 ? (
                <p className="muted-copy">No active integrations for this filter.</p>
              ) : (
                activeItems.map((item) => (
                  <article
                    key={item.key}
                    className={`integration-card ${selectedIntegration?.key === item.key ? "integration-selected" : ""}`}
                  >
                    <div className="integration-card-head">
                      <div>
                        <h3>{item.label}</h3>
                        <p className="muted-line">{item.summary}</p>
                      </div>
                      <span className={`integration-badge badge-${item.status}`}>{item.status.replace(/_/g, " ")}</span>
                    </div>
                    <div className="integration-meta">
                      <span>{item.category}</span>
                      <span>{item.auth_type}</span>
                      <span>{item.api_ready ? "API-ready" : "Awaiting API"}</span>
                    </div>
                    <div className="integration-actions-row">
                      <button type="button" className="button-secondary integration-action" onClick={() => previewIntegration(item)}>
                        View spec
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleIntegration(item)}
                        disabled={busy === item.key || !canMutate}
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

          <div className="surface-card">
            <h2 className="integration-panel-title">Planned</h2>
            <div className="integration-list">
              {plannedItems.length === 0 ? (
                <p className="muted-copy">No planned connectors for this filter.</p>
              ) : (
                plannedItems.map((item) => (
                  <article
                    key={item.key}
                    className={`integration-card ${selectedIntegration?.key === item.key ? "integration-selected" : ""}`}
                  >
                    <div className="integration-card-head">
                      <div>
                        <h3>{item.label}</h3>
                        <p className="muted-line">{item.summary}</p>
                      </div>
                      <span className="integration-badge badge-placeholder">Planned</span>
                    </div>
                    <div className="integration-meta">
                      <span>{item.category}</span>
                      <span>{item.auth_type}</span>
                      <span>{item.enabled ? "Staged on" : "Staged off"}</span>
                    </div>
                    <div className="integration-actions-row">
                      <button type="button" className="button-secondary integration-action" onClick={() => previewIntegration(item)}>
                        View spec
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleIntegration(item)}
                        disabled={busy === item.key || !canMutate}
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

        <aside className="surface-card integration-detail-card integration-detail-card-pro">
          <IntegrationDetailPanel item={selectedIntegration} />
        </aside>
      </section>
    </PageFrame>
  );
}
