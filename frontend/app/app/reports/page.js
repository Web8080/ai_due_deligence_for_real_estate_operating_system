"use client";
// Author: Victor.I

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "../../components/auth-provider";
import PageFrame from "../../components/page-frame";
import { fetchJson, getApiBase } from "../../lib/reos-client";

export default function ReportsPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [overview, setOverview] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth?.token) return;
    fetchJson(`${API}/reports/overview`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(setOverview)
      .catch((error) => setMessage(error.message));
  }, [API, auth]);

  return (
    <PageFrame
      eyebrow="Portfolio"
      title="Committee and reporting queue"
      subtitle="Committee queue and executive brief reduce slide rebuild from raw tabs. Export packs and IC memo automation are partial; Overview shows OS KPIs for discovery-to-decision time."
    >
      {message ? <p className="inline-alert alert-error">{message}</p> : null}
      <section className="surface-card" style={{ marginBottom: "18px" }}>
        <h2>What is automated today</h2>
        <ul className="feature-copy" style={{ margin: "10px 0 0", paddingLeft: "1.25rem", lineHeight: 1.6 }}>
          <li>
            Deal context: <Link href="/app/deals">Deals</Link> workspaces, stages, documents, investor rows.
          </li>
          <li>
            Narrative feed: <Link href="/app">Overview</Link> briefing + decision velocity metrics.
          </li>
          <li>
            Packet export to PowerPoint/PDF is not wired; copy brief below into your template.
          </li>
        </ul>
      </section>
      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <h2>Report queue</h2>
          <div className="signal-list">
            {(overview?.report_queue || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Report</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="surface-card">
          <h2>Executive brief</h2>
          <p className="feature-copy">{overview?.executive_brief}</p>
        </article>
      </section>
    </PageFrame>
  );
}
