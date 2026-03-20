"use client";
// Author: Victor.I

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import AICopilotPanel from "../../../components/ai-copilot-panel";
import { useAuth } from "../../../components/auth-provider";
import MetricGrid from "../../../components/metric-grid";
import PageFrame from "../../../components/page-frame";
import { authHeaders, fetchJson, getApiBase } from "../../../lib/reos-client";

const DEAL_STAGES = [
  "Lead",
  "Screening",
  "Due Diligence",
  "Investment Committee",
  "Approved",
  "Closing",
  "Passed",
];

export default function DealWorkspacePage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const params = useParams();
  const dealId = params?.id;

  const [token, setToken] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [question, setQuestion] = useState("What are the main diligence risks and open issues?");
  const [noteText, setNoteText] = useState("");

  const headers = useMemo(() => authHeaders(token), [token]);

  useEffect(() => {
    if (auth?.token) {
      setToken(auth.token);
    }
  }, [auth]);

  async function loadWorkspace(currentToken) {
    const tokenToUse = currentToken || token;
    if (!tokenToUse || !dealId) return;
    try {
      const data = await fetchJson(`${API}/deals/${dealId}/workspace`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      setWorkspace(data);
    } catch (error) {
      setMessage(error.message || "Could not load the deal workspace.");
    }
  }

  useEffect(() => {
    if (token && dealId) loadWorkspace(token);
  }, [token, dealId]);

  async function addNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setBusy("note");
    try {
      await fetchJson(`${API}/deals/${dealId}/notes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: noteText }),
      });
      setNoteText("");
      setMessage("Note saved.");
      await loadWorkspace();
    } catch (error) {
      setMessage(error.message || "Could not add note.");
    } finally {
      setBusy("");
    }
  }

  async function askAi(e) {
    e.preventDefault();
    setBusy("ask");
    try {
      const data = await fetchJson(`${API}/ai/query/${dealId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ question }),
      });
      setMessage(`AI analysis updated with ${data.citations.length} citations.`);
      await loadWorkspace();
    } catch (error) {
      setMessage(error.message || "AI query failed.");
    } finally {
      setBusy("");
    }
  }

  async function uploadDocument(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    if (!file || typeof file === "string") return;
    setBusy("upload");
    try {
      const req = new FormData();
      req.append("file", file);
      const data = await fetchJson(`${API}/documents/${dealId}/upload`, {
        method: "POST",
        headers: authHeaders(token, null),
        body: req,
      });
      setMessage(`Uploaded ${data.filename}.`);
      e.currentTarget.reset();
      await loadWorkspace();
    } catch (error) {
      setMessage(error.message || "Upload failed.");
    } finally {
      setBusy("");
    }
  }

  const deal = workspace?.deal;

  const stageOptions = useMemo(() => {
    const set = new Set(DEAL_STAGES);
    if (deal?.stage) set.add(deal.stage);
    return Array.from(set);
  }, [deal?.stage]);

  async function updateDealStage(nextStage) {
    if (!nextStage || nextStage === workspace?.deal?.stage) return;
    setBusy("stage");
    try {
      await fetchJson(`${API}/deals/${dealId}/stage`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ stage: nextStage }),
      });
      setMessage(`Stage updated to ${nextStage}.`);
      await loadWorkspace(token);
    } catch (error) {
      setMessage(error.message || "Stage update failed.");
    } finally {
      setBusy("");
    }
  }

  const metrics = deal
    ? [
        { label: "Stage", value: deal.stage, detail: deal.next_action || "No next action yet" },
        { label: "Priority", value: deal.priority, detail: deal.owner_name || "Owner pending" },
        { label: "Documents", value: workspace?.documents.length || 0, detail: "Processed materials" },
        { label: "Investors", value: workspace?.investor_pipeline.length || 0, detail: "Tracked investor signals" },
      ]
    : [];

  return (
    <PageFrame
      eyebrow="Deal Workspace"
      title={deal ? deal.name : "Deal workspace"}
      subtitle="Live decision surface: verdict draft, blocking gaps, and next actions — not a substitute for IC vote. Documents and AI support due diligence automation beneath it."
    >
      {message ? <p className="message">{message}</p> : null}
      {!workspace ? (
        <section className="surface-card">
          <p>Loading deal workspace...</p>
        </section>
      ) : (
        <>
          <MetricGrid items={metrics} />

          {workspace.decision_surface ? (
            <section className="surface-card decision-surface-card" aria-labelledby="decision-surface-heading">
              <h2 id="decision-surface-heading">Decision surface (draft)</h2>
              <p className="muted-copy">{workspace.decision_surface.automation_note}</p>
              <div className="decision-surface-head">
                <span className={`verdict-pill verdict-${workspace.decision_surface.current_verdict}`}>
                  {workspace.decision_surface.current_verdict.replace(/_/g, " ")}
                </span>
                <span className="decision-confidence">
                  Confidence {workspace.decision_surface.confidence}% — {workspace.decision_surface.confidence_rationale}
                </span>
              </div>
              <div className="content-grid two-column-grid decision-surface-columns">
                <div>
                  <h3>Blocking gaps</h3>
                  <ul className="decision-list">
                    {(workspace.decision_surface.blocking_gaps || []).map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                  <h3>Top risks (diligence)</h3>
                  <ul className="decision-list">
                    {(workspace.decision_surface.top_risks || []).map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Next best actions</h3>
                  <ol className="decision-list numbered">
                    {(workspace.decision_surface.next_best_actions || []).map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ol>
                  <h3>Key assumptions (explicit)</h3>
                  <ul className="decision-list">
                    {(workspace.decision_surface.key_assumptions || []).map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                  <h3>Downside</h3>
                  <p className="feature-copy">{workspace.decision_surface.downside_scenario}</p>
                  <h3>Document DD checks</h3>
                  <ul className="decision-list">
                    {(workspace.decision_surface.document_dd_checks || []).map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                  <h3>Investors</h3>
                  <p className="feature-copy">{workspace.decision_surface.investor_posture_summary}</p>
                  <p className="muted-copy">
                    <Link href="/app/crm">CRM email import</Link> updates pipeline signals tied to this deal.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="content-grid two-column-grid">
            <div className="surface-card">
              <h2>Summary</h2>
              <div className="signal-list">
                <div className="signal-row">
                  <strong>Asset</strong>
                  <span>{deal.asset_type || "Not specified"}</span>
                </div>
                <div className="signal-row">
                  <strong>Location</strong>
                  <span>{[deal.city, deal.state].filter(Boolean).join(", ") || "Not specified"}</span>
                </div>
                <div className="signal-row">
                  <strong>Source</strong>
                  <span>{deal.source || "Not specified"}</span>
                </div>
                <div className="signal-row">
                  <strong>Next action</strong>
                  <span>{deal.next_action || "Set next action"}</span>
                </div>
                <div className="deal-stage-form">
                  <label className="field-label" htmlFor="deal-stage-select">
                    Deal stage (audited)
                  </label>
                  <select
                    id="deal-stage-select"
                    value={deal.stage}
                    onChange={(e) => updateDealStage(e.target.value)}
                    disabled={busy === "stage"}
                    aria-label="Change deal stage"
                  >
                    {stageOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="surface-card">
              <h2>Operating context</h2>
              <div className="signal-list">
                {workspace.operations_summary.map((line) => (
                  <div key={line} className="signal-row">
                    <strong>Signal</strong>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="content-grid two-column-grid">
            <div className="surface-card">
              <h2>Documents</h2>
              <form onSubmit={uploadDocument} className="stack-form">
                <input name="file" type="file" required />
                <button type="submit" disabled={busy === "upload"}>
                  {busy === "upload" ? "Uploading..." : "Upload document"}
                </button>
              </form>
              <div className="signal-list">
                {workspace.documents.map((doc) => (
                  <div key={doc.id} className="signal-row">
                    <strong>{doc.filename}</strong>
                    <span>
                      {doc.document_type} · {doc.status}
                      {doc.summary ? ` · ${doc.summary}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="surface-card">
              <h2>Diligence</h2>
              <div className="signal-list">
                {workspace.diligence_items.map((item) => (
                  <div key={item.id} className="signal-row">
                    <strong>{item.title}</strong>
                    <span>
                      {item.status} · {item.severity}
                      {item.owner_name ? ` · ${item.owner_name}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="content-grid two-column-grid">
            <div className="surface-card">
              <h2>AI Brief</h2>
              <form onSubmit={askAi} className="stack-form">
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} />
                <button type="submit" disabled={busy === "ask"}>
                  {busy === "ask" ? "Running..." : "Run document-backed analysis"}
                </button>
              </form>
              <div className="signal-list">
                {workspace.ai_history.length === 0 ? (
                  <p>No saved AI analysis yet.</p>
                ) : (
                  workspace.ai_history.map((item) => (
                    <div key={item.id} className="signal-row">
                      <strong>{item.question}</strong>
                      <span>{item.answer.slice(0, 180)}...</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <AICopilotPanel
              workspace="deal"
              dealId={Number(dealId)}
              title="Deal copilot"
              defaultPrompt="Summarize the underwriting posture, main diligence contradictions, and the next investor-ready actions."
            />
          </section>

          <section className="content-grid two-column-grid">
            <div className="surface-card">
              <h2>Investor Pipeline</h2>
              <div className="signal-list">
                {workspace.investor_pipeline.length === 0 ? (
                  <p>No tracked investors yet.</p>
                ) : (
                  workspace.investor_pipeline.map((item) => (
                    <div key={item.id} className="signal-row">
                      <strong>{item.status}</strong>
                      <span>
                        ${Number(item.commitment_amount || 0).toLocaleString()} · {item.conviction}
                        {item.next_action ? ` · ${item.next_action}` : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="surface-card">
              <h2>Timeline</h2>
              <div className="signal-list">
                {workspace.stage_events.map((event) => (
                  <div key={event.id} className="signal-row">
                    <strong>{event.to_stage}</strong>
                    <span>
                      {event.from_stage ? `from ${event.from_stage} · ` : ""}
                      {event.reason || "No reason"} · {event.author}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="content-grid">
            <div className="surface-card">
              <h2>Notes</h2>
              <form onSubmit={addNote} className="stack-form">
                <textarea
                  rows={3}
                  placeholder="Capture an internal note for this deal..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button type="submit" disabled={busy === "note"}>
                  {busy === "note" ? "Saving..." : "Save note"}
                </button>
              </form>
              <div className="signal-list">
                {workspace.notes.length === 0 ? (
                  <p>No notes yet.</p>
                ) : (
                  workspace.notes.map((note) => (
                    <div key={note.id} className="signal-row">
                      <strong>{note.author}</strong>
                      <span>{note.content}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </PageFrame>
  );
}
