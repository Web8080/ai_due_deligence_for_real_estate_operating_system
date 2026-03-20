"use client";

import { useEffect, useState } from "react";

import { useAuth } from "../../components/auth-provider";
import PageFrame from "../../components/page-frame";
import { fetchJson, getApiBase } from "../../lib/reos-client";

export default function AdminPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [overview, setOverview] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!auth?.token) return;
    fetchJson(`${API}/admin/overview`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(setOverview)
      .catch((error) => setMessage(error.message));
  }, [API, auth]);

  return (
    <PageFrame
      eyebrow="Admin"
      title="Workspace administration"
      subtitle="Review users, providers, operating modes, and the current integration posture across the enterprise environment."
    >
      {message ? <p className="inline-alert alert-error">{message}</p> : null}
      <section className="content-grid three-column-grid">
        <article className="surface-card">
          <h2>Users</h2>
          <div className="signal-list">
            {(overview?.users || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>User</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="surface-card">
          <h2>Providers</h2>
          <div className="signal-list">
            {(overview?.providers || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Provider</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="surface-card">
          <h2>Operating modes</h2>
          <div className="signal-list">
            {(overview?.operating_modes || []).map((item) => (
              <div key={item} className="signal-row">
                <strong>Mode</strong>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <article className="surface-card">
        <h2>Integration posture</h2>
        <div className="signal-list">
          {(overview?.integration_status || []).map((item) => (
            <div key={item} className="signal-row">
              <strong>Status</strong>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </article>
    </PageFrame>
  );
}
