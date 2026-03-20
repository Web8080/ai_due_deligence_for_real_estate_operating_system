"use client";
// Author: Victor.I
// Lightweight rollout tracker; long-form narrative lives in docs only.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import PageFrame from "../../components/page-frame";
import { useAuth } from "../../components/auth-provider";
import { fetchJson, getApiBase } from "../../lib/reos-client";
import { automationGroups } from "../../lib/automation-playbook-data";

export default function StrategyPlaybookPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [checklist, setChecklist] = useState([]);
  const [checklistErr, setChecklistErr] = useState("");

  useEffect(() => {
    if (!auth?.token) return;
    fetchJson(`${API}/playbook/checklist`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => setChecklist(r.items || []))
      .catch((e) => setChecklistErr(e.message));
  }, [API, auth?.token]);

  const doneByKey = useMemo(() => Object.fromEntries(checklist.map((r) => [r.group_key, r.complete])), [checklist]);

  const toggleGroup = useCallback(
    async (groupKey) => {
      if (!auth?.token) return;
      try {
        const r = await fetchJson(`${API}/playbook/checklist/toggle`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ group_key: groupKey }),
        });
        setChecklist(r.items || []);
        setChecklistErr("");
      } catch (e) {
        setChecklistErr(e.message);
      }
    },
    [API, auth?.token]
  );

  return (
    <PageFrame
      eyebrow="Operations"
      title="Automation rollout"
      subtitle="Track themed automation groups. Strategy decks and expansion notes are in the docs repo, not duplicated here."
    >
      {checklistErr ? <p className="inline-alert alert-error">{checklistErr}</p> : null}

      <section className="surface-card" style={{ marginBottom: "18px" }}>
        <h2 className="playbook-h2" style={{ marginTop: 0 }}>
          Documentation
        </h2>
        <p className="feature-copy">
          Operator narrative and integration blueprint:{" "}
          <code className="playbook-code">docs/ai-automation-deep-expansion.md</code>,{" "}
          <code className="playbook-code">docs/ai-automation-operator-perspective-expansion.md</code>, and your Beamer
          sources under <code className="playbook-code">docs/</code>.
        </p>
        <p className="feature-copy">
          Live vendor wiring: <Link href="/app/integrations">Integrations</Link>. Governance and AI posture:{" "}
          <Link href="/app/governance">Controls and audit</Link>.
        </p>
      </section>

      <section className="playbook-section">
        <h2 className="playbook-h2">50 automation themes (checklist)</h2>
        <p className="muted-copy">Mark groups as your team implements them; state syncs to the server.</p>
        <div className="playbook-table-wrap">
          <table className="playbook-table">
            <thead>
              <tr>
                <th scope="col">Done</th>
                <th scope="col">#</th>
                <th scope="col">Theme</th>
              </tr>
            </thead>
            <tbody>
              {automationGroups.map((row) => (
                <tr key={row.range} className={doneByKey[row.range] ? "playbook-row-done" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={Boolean(doneByKey[row.range])}
                      onChange={() => toggleGroup(row.range)}
                      aria-label={`Mark ${row.range} ${row.theme} complete`}
                    />
                  </td>
                  <td>{row.range}</td>
                  <td>{row.theme}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageFrame>
  );
}
