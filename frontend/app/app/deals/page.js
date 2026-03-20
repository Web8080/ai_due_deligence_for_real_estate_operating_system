"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import AICopilotPanel from "../../components/ai-copilot-panel";
import { useAuth } from "../../components/auth-provider";
import MetricGrid from "../../components/metric-grid";
import PageFrame from "../../components/page-frame";
import { fetchJson, getApiBase } from "../../lib/reos-client";

export default function DealsHubPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [overview, setOverview] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth?.token) return;
    fetchJson(`${API}/deals/overview`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(setOverview)
      .catch((error) => setMessage(error.message));
  }, [API, auth]);

  const analytics = overview?.analytics || { total_deals: 0, total_documents: 0 };
  const active = overview?.active_diligence || [];
  const closing = overview?.closing_pipeline || [];

  return (
    <PageFrame
      eyebrow="Deals"
      title="Deals hub"
      subtitle="Track intake, active diligence, and committee or closing readiness through denser, operating-oriented deal surfaces."
    >
      {message ? <p className="inline-alert alert-error">{message}</p> : null}
      <MetricGrid
        items={[
          { label: "Total deals", value: analytics.total_deals, detail: "Current pipeline footprint" },
          { label: "Documents", value: analytics.total_documents, detail: "Attached document intelligence" },
          { label: "Active diligence", value: active.length, detail: "Execution queue" },
          { label: "Closing / approved", value: closing.length, detail: "Near-term outcomes" },
        ]}
      />

      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <div className="panel-head">
            <div>
              <p className="section-eyebrow">Active Diligence</p>
              <h2>Deals under review</h2>
            </div>
          </div>
          <div className="signal-list">
            {active.map((deal) => (
              <Link key={deal.id} href={`/app/deals/${deal.id}`} className="table-link">
                <strong>{deal.name}</strong>
                <span>
                  {deal.stage} / {deal.asset_type || "Asset"} / {deal.city || "Unknown"} / {deal.priority}
                </span>
              </Link>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <div className="panel-head">
            <div>
              <p className="section-eyebrow">Committee & Closing</p>
              <h2>Ready for decision</h2>
            </div>
          </div>
          <div className="signal-list">
            {closing.map((deal) => (
              <Link key={deal.id} href={`/app/deals/${deal.id}`} className="table-link">
                <strong>{deal.name}</strong>
                <span>{deal.stage} / {deal.next_action || "Set next action"}</span>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <div className="panel-head">
            <div>
              <p className="section-eyebrow">Intake Signals</p>
              <h2>Origination context</h2>
            </div>
          </div>
          <div className="signal-list">
            {(overview?.intake_summary || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Signal</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <AICopilotPanel
          workspace="deals"
          title="Deal pipeline copilot"
          defaultPrompt="Which deals need escalation, which are ready for committee, and where is diligence coverage thin?"
        />
      </section>
    </PageFrame>
  );
}
