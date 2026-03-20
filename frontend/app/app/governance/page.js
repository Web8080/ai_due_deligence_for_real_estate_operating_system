"use client";
// Author: Victor.I

import { useEffect, useState } from "react";

import { useAuth } from "../../components/auth-provider";
import MetricGrid from "../../components/metric-grid";
import PageFrame from "../../components/page-frame";
import { fetchJson, getApiBase } from "../../lib/reos-client";

export default function GovernancePage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [overview, setOverview] = useState(null);
  const [aiHealth, setAiHealth] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth?.token) return;
    fetchJson(`${API}/governance/overview`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(setOverview)
      .catch((error) => setMessage(error.message));
    fetchJson(`${API}/health/ai`)
      .then(setAiHealth)
      .catch(() => setAiHealth(null));
  }, [API, auth?.token]);

  return (
    <PageFrame
      eyebrow="Governance"
      title="Controls, audit, and AI safety posture"
      subtitle="Audit trails, session footprint, guardrails, and which vendor paths are placeholders until keys and workers exist."
    >
      {message ? <p className="inline-alert alert-error">{message}</p> : null}

      {aiHealth ? (
        <section className="surface-card gov-ai-health" style={{ marginBottom: "18px" }}>
          <h2>AI runtime (unauthenticated health probe)</h2>
          <p className="feature-copy">
            Provider: <code>{aiHealth.ai_provider}</code> · Ollama reachable:{" "}
            <strong>{aiHealth.ollama_reachable === null ? "n/a" : String(aiHealth.ollama_reachable)}</strong> ·
            local_fallback: <code>{String(aiHealth.local_fallback)}</code> · ML forecast:{" "}
            <code>{aiHealth.predictive_ml}</code>
          </p>
          <p className="muted-copy">{aiHealth.note}</p>
        </section>
      ) : null}

      <MetricGrid
        items={[
          { label: "AI runs", value: overview?.ai_run_count || 0, detail: "Tracked copilot and document queries" },
          { label: "Sessions", value: overview?.session_count || 0, detail: "Issued signed sessions" },
        ]}
      />

      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <h2>Controls</h2>
          <div className="signal-list">
            {(overview?.controls || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Control</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <h2>Guardrails</h2>
          <div className="signal-list">
            {(overview?.guardrails || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Policy</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <h2>Hallucination and evaluation</h2>
          <div className="signal-list">
            {(overview?.hallucination_controls || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Practice</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <h2>External services (placeholders)</h2>
          <p className="feature-copy">
            Dashboards use seeded data; live vendor calls stay off until environment variables and jobs are configured.
          </p>
          <div className="signal-list">
            {(overview?.external_placeholders || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Vendor / capability</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <h2>AI runtime notes</h2>
          <div className="signal-list">
            {(overview?.ai_runtime_notes || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Note</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <h2>Audit trail</h2>
          <div className="signal-list">
            {(overview?.audit_events || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Event</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </PageFrame>
  );
}
