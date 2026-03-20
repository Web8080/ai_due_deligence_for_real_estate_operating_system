"use client";
// Author: Victor.I

import { useEffect, useState } from "react";
import Link from "next/link";

import AICopilotPanel from "../../components/ai-copilot-panel";
import { useAuth } from "../../components/auth-provider";
import MetricGrid from "../../components/metric-grid";
import PageFrame from "../../components/page-frame";
import { fetchJson, getApiBase } from "../../lib/reos-client";

export default function InvestorsPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [overview, setOverview] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth?.token) return;
    fetchJson(`${API}/investors/overview`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(setOverview)
      .catch((error) => setMessage(error.message));
  }, [API, auth]);

  const pipeline = overview?.investor_pipeline || [];

  return (
    <PageFrame
      eyebrow="Investors"
      title="Investor management"
      subtitle="Coordinate prospects, momentum, commitment posture, and onboarding steps with AI-assisted investor briefings."
    >
      {message ? <p className="inline-alert alert-error">{message}</p> : null}
      <MetricGrid
        items={[
          { label: "Tracked entries", value: pipeline.length, detail: "Investor pipeline rows" },
          { label: "Interested", value: pipeline.filter((item) => item.status === "interested").length, detail: "Warm investor signals" },
          { label: "Committed", value: pipeline.filter((item) => item.status === "committed").length, detail: "Active commitments" },
          { label: "Passed", value: pipeline.filter((item) => item.status === "passed").length, detail: "Disqualified momentum" },
        ]}
      />

      <section className="content-grid single-column">
        <article className="surface-card">
          <h2>Chasing investors from email</h2>
          <p className="feature-copy">
            Log replies and commitment language from pasted threads under{" "}
            <Link href="/app/crm">Contacts &amp; Companies</Link>. Pick a deal when committing so pipeline status updates with the
            inferred decision.
          </p>
        </article>
      </section>

      {overview?.conversion_action_hints?.length ? (
        <section className="content-grid single-column">
          <article className="surface-card">
            <h2>Conversion actions (rules-based)</h2>
            <p className="muted-copy">
              Ghosting and stalled rows get a concrete next move. This is execution nudges, not investor scoring ML yet.
            </p>
            <ul className="conversion-hint-list">
              {overview.conversion_action_hints.map((h) => (
                <li key={`${h.pipeline_entry_id}-${h.deal_id}`}>
                  <span className={`urgency-dot urgency-${h.urgency}`} title={h.urgency} />
                  <Link href={`/app/deals/${h.deal_id}`}>Deal #{h.deal_id}</Link> — {h.hint}
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}

      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <h2>Pipeline</h2>
          <div className="signal-list">
            {pipeline.map((item) => (
              <div key={item.id} className="signal-row">
                <strong>{item.status}</strong>
                <span>
                  ${Number(item.commitment_amount || 0).toLocaleString()} / {item.conviction || "unknown"} /{" "}
                  {item.next_action || "Set next action"}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <h2>Onboarding posture</h2>
          <div className="signal-list">
            {(overview?.onboarding_status || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Onboarding</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="feature-copy">{overview?.ai_briefing}</p>
        </article>
      </section>

      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <h2>Focus notes</h2>
          <div className="signal-list">
            {(overview?.focus_notes || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Fit</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <AICopilotPanel
          workspace="investors"
          title="Investor copilot"
          defaultPrompt="Summarize fit, outreach timing, commitment confidence, and which investor relationships need immediate attention."
        />
      </section>
    </PageFrame>
  );
}
