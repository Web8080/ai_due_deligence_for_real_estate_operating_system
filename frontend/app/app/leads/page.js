"use client";
// Author: Victor.I

import { useCallback, useEffect, useState } from "react";

import AICopilotPanel from "../../components/ai-copilot-panel";
import { useAuth } from "../../components/auth-provider";
import PageFrame from "../../components/page-frame";
import { fetchJson, getApiBase } from "../../lib/reos-client";

export default function LeadsPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [overview, setOverview] = useState(null);
  const [message, setMessage] = useState("");
  const [aiFit, setAiFit] = useState(null);
  const [aiErr, setAiErr] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!auth?.token) return;
    fetchJson(`${API}/leads/overview`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(setOverview)
      .catch((error) => setMessage(error.message));
  }, [API, auth]);

  const runAiFit = useCallback(() => {
    if (!auth?.token) return;
    setAiLoading(true);
    setAiErr("");
    fetchJson(`${API}/leads/ai-fit-preview`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(setAiFit)
      .catch((e) => setAiErr(e.message || "Request failed"))
      .finally(() => setAiLoading(false));
  }, [API, auth]);

  return (
    <PageFrame
      eyebrow="Intake & Outreach"
      title="Origination and lead intake"
      subtitle="Broker and direct channels, Apollo-style prospecting placeholders, and AI fit ranking over workspace deals."
    >
      {message ? <p className="inline-alert alert-error">{message}</p> : null}

      {overview?.apollo ? (
        <section className="content-grid leads-apollo-hero">
          <article className="surface-card leads-apollo-card">
            <h2>Apollo.io connector</h2>
            <p className="feature-copy">{overview.apollo.narrative}</p>
            <dl className="leads-apollo-dl">
              <div>
                <dt>Status</dt>
                <dd>{overview.apollo.status.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt>Last sync</dt>
                <dd>{overview.apollo.last_sync_display}</dd>
              </div>
              <div>
                <dt>Env var</dt>
                <dd>
                  <code>{overview.apollo.api_env_key}</code>
                </dd>
              </div>
            </dl>
          </article>
          <article className="surface-card">
            <h2>Sample enriched prospects</h2>
            <p className="feature-copy">Representative records for UI review; live pull requires API key and worker.</p>
            <ul className="leads-prospect-list">
              {(overview.apollo_prospects || []).map((p, i) => (
                <li key={i}>
                  <div className="leads-prospect-head">
                    <strong>{p.person_name}</strong>
                    <span className="leads-fit">{p.fit_score}</span>
                  </div>
                  <span className="leads-prospect-meta">
                    {p.title} · {p.organization}
                  </span>
                  <span className="leads-prospect-icp">{p.icp_match}</span>
                  <p className="leads-prospect-ai">{p.ai_note}</p>
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <h2>Origination queue</h2>
          <div className="signal-list">
            {(overview?.lead_deals || []).map((deal) => (
              <div key={deal.id} className="signal-row">
                <strong>{deal.name}</strong>
                <span>
                  {deal.stage} / {deal.source || "Direct"} / {deal.city || "Unknown"}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <h2>Outreach cadence</h2>
          <div className="signal-list">
            {(overview?.outreach_queue || []).map((item, idx) => (
              <div key={idx} className="signal-row">
                <strong>Follow-up</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid two-column-grid">
        <article className="surface-card leads-ai-card">
          <h2>AI fit ranking (demo)</h2>
          <p className="feature-copy">
            Server-side heuristic ranks Lead and Screening deals for mandate fit. Swap in LLM-backed scoring when your model route is
            approved.
          </p>
          <button type="button" className="leads-ai-btn" onClick={runAiFit} disabled={aiLoading}>
            {aiLoading ? "Running…" : "Run fit preview"}
          </button>
          {aiErr ? <p className="inline-alert alert-error">{aiErr}</p> : null}
          {aiFit?.summary ? <p className="leads-ai-summary">{aiFit.summary}</p> : null}
          {aiFit?.model_route ? (
            <p className="muted-copy">
              Route: <code>{aiFit.model_route}</code> · {aiFit.generated_at}
            </p>
          ) : null}
          {aiFit?.ranked?.length ? (
            <ol className="leads-ai-rank">
              {aiFit.ranked.map((r) => (
                <li key={r.deal_id}>
                  <strong>{r.name}</strong> <span className="leads-fit">{r.fit_score}</span>
                  <div className="muted-copy">
                    {r.stage} · {r.priority}
                  </div>
                  <p>{r.rationale}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </article>

        <AICopilotPanel
          workspace="leads"
          title="Origination copilot"
          defaultPrompt="Which lead opportunities deserve immediate outreach, and what should the team prioritize first?"
        />
      </section>

      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <h2>Signal readout</h2>
          <div className="signal-list">
            {(overview?.origination_signals || []).map((item, idx) => (
              <div key={idx} className="signal-row">
                <strong>Signal</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="feature-copy">{overview?.ai_briefing}</p>
        </article>
      </section>
    </PageFrame>
  );
}
