"use client";

import { useEffect, useState } from "react";

import AICopilotPanel from "../../components/ai-copilot-panel";
import { useAuth } from "../../components/auth-provider";
import PageFrame from "../../components/page-frame";
import { fetchJson, getApiBase } from "../../lib/reos-client";

export default function OperationsPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [overview, setOverview] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth?.token) return;
    fetchJson(`${API}/operations/overview`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(setOverview)
      .catch((error) => setMessage(error.message));
  }, [API, auth]);

  return (
    <PageFrame
      eyebrow="Operations"
      title="Workflow and automation control"
      subtitle="Manage task routing, workflow exceptions, automation priorities, and the foundations for asynchronous processing."
    >
      {message ? <p className="inline-alert alert-error">{message}</p> : null}
      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <h2>Workflow tasks</h2>
          <div className="signal-list">
            {(overview?.tasks || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Task</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <h2>Exception queue</h2>
          <div className="signal-list">
            {(overview?.exceptions || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Exception</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <h2>Automation priorities</h2>
          <div className="signal-list">
            {(overview?.automation_priorities || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Priority</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="feature-copy">{overview?.ai_briefing}</p>
        </article>

        <AICopilotPanel
          workspace="operations"
          title="Operations copilot"
          defaultPrompt="Summarize workflow pressure, overdue lanes, and which automations should be activated next."
        />
      </section>
    </PageFrame>
  );
}
