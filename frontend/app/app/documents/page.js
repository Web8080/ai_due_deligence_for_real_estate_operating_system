"use client";

import { useEffect, useState } from "react";

import AICopilotPanel from "../../components/ai-copilot-panel";
import { useAuth } from "../../components/auth-provider";
import MetricGrid from "../../components/metric-grid";
import PageFrame from "../../components/page-frame";
import { fetchJson, getApiBase } from "../../lib/reos-client";

export default function DocumentsPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [library, setLibrary] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth?.token) return;
    fetchJson(`${API}/documents/library`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(setLibrary)
      .catch((error) => setMessage(error.message));
  }, [API, auth]);

  return (
    <PageFrame
      eyebrow="AI & Documents"
      title="Document intelligence"
      subtitle="Monitor the live document library, review extracted signals, and run AI assistance against the active corpus."
    >
      {message ? <p className="inline-alert alert-error">{message}</p> : null}
      <MetricGrid items={[{ label: "Documents", value: library?.total_documents || 0, detail: "Processed document rows" }]} />

      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <h2>Library</h2>
          <div className="signal-list">
            {(library?.documents || []).map((document) => (
              <div key={document.id} className="signal-row">
                <strong>{document.filename}</strong>
                <span>
                  {document.document_type} / {document.status} / {document.risk_tags || "No risk tags"}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <h2>Intelligence posture</h2>
          <div className="signal-list">
            {(library?.document_signals || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Signal</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="feature-copy">{library?.ai_briefing}</p>
        </article>
      </section>

      <AICopilotPanel
        workspace="documents"
        title="Document copilot"
        defaultPrompt="Summarize the current document intelligence posture, the missing extraction coverage, and which files deserve the next review pass."
      />
    </PageFrame>
  );
}
