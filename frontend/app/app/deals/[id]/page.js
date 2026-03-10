"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AppShell from "../../../components/app-shell";
import { authHeaders, clearStoredAuth, getApiBase, getStoredAuth } from "../../../lib/reos-client";

export default function DealWorkspacePage() {
  const API = getApiBase();
  const router = useRouter();
  const params = useParams();
  const dealId = params?.id;

  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [question, setQuestion] = useState("What are the main diligence risks and open issues?");
  const [noteText, setNoteText] = useState("");

  const headers = useMemo(() => authHeaders(token), [token]);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      router.push("/login");
      return;
    }
    setToken(auth.token);
    setRole(auth.role || "member");
    setUsername(auth.username || "");
  }, [router]);

  async function loadWorkspace(currentToken) {
    const tokenToUse = currentToken || token;
    if (!tokenToUse || !dealId) return;
    try {
      const res = await fetch(`${API}/deals/${dealId}/workspace`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Could not load the deal workspace.");
        return;
      }
      setWorkspace(data);
    } catch {
      setMessage("Could not load the deal workspace.");
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
      const res = await fetch(`${API}/deals/${dealId}/notes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: noteText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Could not add note.");
        return;
      }
      setNoteText("");
      setMessage("Note saved.");
      await loadWorkspace();
    } finally {
      setBusy("");
    }
  }

  async function askAi(e) {
    e.preventDefault();
    setBusy("ask");
    try {
      const res = await fetch(`${API}/ai/query/${dealId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "AI query failed.");
        return;
      }
      setMessage(`AI analysis updated with ${data.citations.length} citations.`);
      await loadWorkspace();
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
      const res = await fetch(`${API}/documents/${dealId}/upload`, {
        method: "POST",
        headers: authHeaders(token, null),
        body: req,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Upload failed.");
        return;
      }
      setMessage(`Uploaded ${data.filename}.`);
      e.currentTarget.reset();
      await loadWorkspace();
    } finally {
      setBusy("");
    }
  }

  function logout() {
    clearStoredAuth();
    router.push("/login");
  }

  const deal = workspace?.deal;

  return (
    <AppShell
      title={deal ? deal.name : "Deal Workspace"}
      subtitle="Review diligence, documents, investor momentum, and saved operating context for a single opportunity."
      username={username}
      role={role}
      onLogout={logout}
    >
      {message ? <p className="message">{message}</p> : null}
      {!workspace ? (
        <section className="card">
          <p>Loading deal workspace...</p>
        </section>
      ) : (
        <>
          <section className="grid">
            <div className="card">
              <h2>Overview</h2>
              <ul className="list">
                <li>Stage: {deal.stage}</li>
                <li>Asset type: {deal.asset_type || "n/a"}</li>
                <li>Location: {[deal.city, deal.state].filter(Boolean).join(", ") || "n/a"}</li>
                <li>Priority: {deal.priority}</li>
                <li>Owner: {deal.owner_name || "n/a"}</li>
                <li>Next action: {deal.next_action || "n/a"}</li>
              </ul>
            </div>
            <div className="card">
              <h2>Operations Summary</h2>
              <ul className="list">
                {workspace.operations_summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid">
            <div className="card">
              <h2>Documents</h2>
              <form onSubmit={uploadDocument} className="stack-form">
                <input name="file" type="file" required />
                <button type="submit" disabled={busy === "upload"}>
                  {busy === "upload" ? "Uploading..." : "Upload Document"}
                </button>
              </form>
              <div className="workspace-table">
                {workspace.documents.map((doc) => (
                  <div key={doc.id} className="table-row-link static-row">
                    <strong>{doc.filename}</strong>
                    <span>
                      {doc.document_type} · {doc.status}
                      {doc.summary ? ` · ${doc.summary}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h2>Diligence</h2>
              <div className="workspace-table">
                {workspace.diligence_items.map((item) => (
                  <div key={item.id} className="table-row-link static-row">
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

          <section className="grid">
            <div className="card">
              <h2>Analysis</h2>
              <form onSubmit={askAi} className="stack-form">
                <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} />
                <button type="submit" disabled={busy === "ask"}>
                  {busy === "ask" ? "Running..." : "Run AI Analysis"}
                </button>
              </form>
              <div className="workspace-table">
                {workspace.ai_history.length === 0 ? (
                  <p>No saved AI analysis yet.</p>
                ) : (
                  workspace.ai_history.map((item) => (
                    <div key={item.id} className="table-row-link static-row">
                      <strong>{item.question}</strong>
                      <span>{item.answer.slice(0, 180)}...</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="card">
              <h2>Investor Pipeline</h2>
              <div className="workspace-table">
                {workspace.investor_pipeline.length === 0 ? (
                  <p>No tracked investors yet.</p>
                ) : (
                  workspace.investor_pipeline.map((item) => (
                    <div key={item.id} className="table-row-link static-row">
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
          </section>

          <section className="grid">
            <div className="card">
              <h2>Stage History</h2>
              <div className="workspace-table">
                {workspace.stage_events.map((event) => (
                  <div key={event.id} className="table-row-link static-row">
                    <strong>{event.to_stage}</strong>
                    <span>
                      {event.from_stage ? `from ${event.from_stage} · ` : ""}
                      {event.reason || "No reason"} · {event.author}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h2>Notes</h2>
              <form onSubmit={addNote} className="stack-form">
                <textarea
                  rows={3}
                  placeholder="Add an internal note for this deal..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button type="submit" disabled={busy === "note"}>
                  {busy === "note" ? "Saving..." : "Add Note"}
                </button>
              </form>
              <div className="workspace-table">
                {workspace.notes.length === 0 ? (
                  <p>No notes yet.</p>
                ) : (
                  workspace.notes.map((note) => (
                    <div key={note.id} className="table-row-link static-row">
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
    </AppShell>
  );
}
