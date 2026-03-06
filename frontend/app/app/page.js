"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:8000`;
  return "http://localhost:8000";
}

export default function AppPage() {
  const API = getApiBase();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedDealId, setSelectedDealId] = useState("");
  const [question, setQuestion] = useState("What are key diligence risks?");
  const [answer, setAnswer] = useState("");
  const [analytics, setAnalytics] = useState({ total_deals: 0, total_contacts: 0, total_documents: 0, stage_distribution: {} });
  const [documents, setDocuments] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [targetStage, setTargetStage] = useState("Due Diligence");
  const [filterStage, setFilterStage] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [busy, setBusy] = useState("");
  const stageOptions = ["Lead", "Screening", "Due Diligence", "Investment Committee", "Approved", "Rejected"];

  const headers = useMemo(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }, [token]);

  useEffect(() => {
    const raw = localStorage.getItem("reos_auth");
    if (!raw) {
      router.push("/login");
      return;
    }
    try {
      const auth = JSON.parse(raw);
      if (!auth?.token) {
        router.push("/login");
        return;
      }
      setToken(auth.token);
      setRole(auth.role || "member");
      setUsername(auth.username || "");
    } catch {
      router.push("/login");
    }
  }, [router]);

  async function loadData(currentToken) {
    const tokenToUse = currentToken || token;
    if (!tokenToUse) return;
    const authHeader = { Authorization: `Bearer ${tokenToUse}` };
    try {
      const [dealsRes, contactsRes] = await Promise.all([
        fetch(`${API}/deals`, { headers: authHeader }),
        fetch(`${API}/crm/contacts`, { headers: authHeader }),
      ]);
      if (!dealsRes.ok || !contactsRes.ok) {
        setMessage("Session expired. Please login again.");
        return;
      }
      const dealPayload = await dealsRes.json();
      const contactPayload = await contactsRes.json();
      setDeals(dealPayload);
      setContacts(contactPayload);
      const summaryRes = await fetch(`${API}/analytics/summary`, { headers: authHeader });
      if (summaryRes.ok) setAnalytics(await summaryRes.json());
      if (dealPayload.length && !selectedDealId) {
        setSelectedDealId(String(dealPayload[0].id));
      }
    } catch {
      setMessage("Could not load dashboard data.");
    }
  }

  useEffect(() => {
    if (token) loadData(token);
  }, [token]);

  useEffect(() => {
    if (!token || !selectedDealId) {
      setDocuments([]);
      setQueryHistory([]);
      setNotes([]);
      return;
    }
    const authHeader = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/documents/deal/${selectedDealId}`, { headers: authHeader }),
      fetch(`${API}/ai/history/${selectedDealId}`, { headers: authHeader }),
      fetch(`${API}/deals/${selectedDealId}/notes`, { headers: authHeader }),
    ])
      .then(async ([docRes, histRes, notesRes]) => {
        setDocuments(docRes.ok ? await docRes.json() : []);
        setQueryHistory(histRes.ok ? await histRes.json() : []);
        setNotes(notesRes.ok ? await notesRes.json() : []);
      })
      .catch(() => {
        setDocuments([]);
        setQueryHistory([]);
        setNotes([]);
      });
  }, [token, selectedDealId]);

  async function createDeal(e) {
    e.preventDefault();
    setBusy("deal");
    const form = new FormData(e.currentTarget);
    const name = form.get("name");
    const description = form.get("description");
    try {
      const res = await fetch(`${API}/deals`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.detail || "Deal creation failed");
        return;
      }
      const created = await res.json();
      e.currentTarget.reset();
      setSelectedDealId(String(created.id));
      setMessage(`Deal #${created.id} created`);
      loadData();
    } finally {
      setBusy("");
    }
  }

  async function createContact(e) {
    e.preventDefault();
    setBusy("contact");
    const form = new FormData(e.currentTarget);
    const full_name = form.get("full_name");
    const email = form.get("email");
    const contact_type = form.get("contact_type");
    const deal_id = Number(form.get("deal_id") || 0) || null;
    try {
      const res = await fetch(`${API}/crm/contacts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ full_name, email, contact_type, deal_id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.detail || "Contact creation failed");
        return;
      }
      e.currentTarget.reset();
      setMessage("Contact created");
      loadData();
    } finally {
      setBusy("");
    }
  }

  async function uploadDocument(e) {
    e.preventDefault();
    setBusy("upload");
    const form = new FormData(e.currentTarget);
    const dealId = form.get("deal_id") || selectedDealId;
    const file = form.get("file");
    if (!dealId) {
      setMessage("Select a deal before uploading.");
      setBusy("");
      return;
    }
    const req = new FormData();
    req.append("file", file);
    try {
      const res = await fetch(`${API}/documents/${dealId}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: req,
      });
      const data = await res.json();
      setMessage(res.ok ? `Uploaded ${data.filename} to deal #${dealId}` : data.detail || "Upload failed");
      if (res.ok) {
        const docRes = await fetch(`${API}/documents/deal/${dealId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (docRes.ok) setDocuments(await docRes.json());
      }
    } finally {
      setBusy("");
    }
  }

  async function askQuestion(e) {
    e.preventDefault();
    setBusy("ask");
    if (!selectedDealId) {
      setMessage("Enter a deal ID first.");
      setBusy("");
      return;
    }
    try {
      const res = await fetch(`${API}/ai/query/${selectedDealId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "AI query failed");
        return;
      }
      setAnswer(`${data.answer}\n\nCitations: ${data.citations.join(", ")}`);
      const histRes = await fetch(`${API}/ai/history/${selectedDealId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (histRes.ok) setQueryHistory(await histRes.json());
    } finally {
      setBusy("");
    }
  }

  async function updateDealStage(e) {
    e.preventDefault();
    if (!selectedDealId) {
      setMessage("Select a deal first.");
      return;
    }
    setBusy("stage");
    try {
      const res = await fetch(`${API}/deals/${selectedDealId}/stage`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ stage: targetStage }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Stage update failed");
        return;
      }
      setMessage(`Deal #${selectedDealId} stage updated to ${data.stage}`);
      loadData();
    } finally {
      setBusy("");
    }
  }

  async function addNote(e) {
    e.preventDefault();
    if (!selectedDealId) {
      setMessage("Select a deal first.");
      return;
    }
    if (!noteText.trim()) return;
    setBusy("note");
    try {
      const res = await fetch(`${API}/deals/${selectedDealId}/notes`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: noteText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Could not add note");
        return;
      }
      setNoteText("");
      setMessage("Note added");
      setNotes((prev) => [data, ...prev].slice(0, 30));
    } finally {
      setBusy("");
    }
  }

  function logout() {
    localStorage.removeItem("reos_auth");
    router.push("/login");
  }

  const visibleDeals = deals.slice(0, 15);
  const visibleContacts = contacts.slice(0, 20);
  const selectedDeal = deals.find((d) => String(d.id) === String(selectedDealId));
  const stageDistEntries = Object.entries(analytics.stage_distribution || {});
  const filteredDeals = visibleDeals.filter((d) => {
    const stageMatch = filterStage === "All" || d.stage === filterStage;
    const q = searchTerm.trim().toLowerCase();
    const searchMatch = q.length === 0 || `${d.id} ${d.name} ${d.description || ""}`.toLowerCase().includes(q);
    return stageMatch && searchMatch;
  });
  const activities = [
    ...documents.map((d) => ({ ts: d.created_at, kind: "document", text: `Uploaded ${d.filename}` })),
    ...queryHistory.map((h) => ({ ts: h.created_at, kind: "ai", text: `AI query: ${h.question}` })),
    ...notes.map((n) => ({ ts: n.created_at, kind: "note", text: `Note by ${n.author}: ${n.content}` })),
  ]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 12);

  function formatAnswer(text) {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function exportDealsCsv() {
    const rows = [
      ["id", "name", "stage", "description"],
      ...filteredDeals.map((d) => [String(d.id), d.name, d.stage, d.description || ""]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reos_filtered_deals.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container dashboard-shell">
      <div className="heading-row">
        <h1 className="title">REOS Dashboard</h1>
        <p className="role-pill">
          {username || "user"} · {role}
        </p>
      </div>
      <div className="stats-row">
        <div className="stat-card">
          <span>Deals</span>
          <strong>{analytics.total_deals}</strong>
        </div>
        <div className="stat-card">
          <span>Contacts</span>
          <strong>{analytics.total_contacts}</strong>
        </div>
        <div className="stat-card">
          <span>Documents</span>
          <strong>{analytics.total_documents}</strong>
        </div>
        <div className="stat-card">
          <span>Active Deal</span>
          <strong>{selectedDealId || "-"}</strong>
        </div>
      </div>
      <div className="actions">
        <button onClick={() => loadData()} disabled={busy === "refresh"}>
          Refresh
        </button>
        <button onClick={logout}>Logout</button>
        <Link href="/" className="button-link button-secondary">
          Landing
        </Link>
      </div>
      {message && <p className="message">{message}</p>}

      <section className="grid">
        <div className="card">
          <h2>Portfolio Analytics</h2>
          {stageDistEntries.length === 0 ? (
            <p>No stage data yet.</p>
          ) : (
            <div className="stage-bars">
              {stageDistEntries.map(([stage, count]) => {
                const pct = analytics.total_deals ? Math.max(6, Math.round((count / analytics.total_deals) * 100)) : 0;
                return (
                  <button
                    key={stage}
                    className={`stage-row stage-button ${filterStage === stage ? "stage-active" : ""}`}
                    onClick={() => setFilterStage(stage)}
                    type="button"
                  >
                    <div className="stage-label">
                      <span>{stage}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="stage-track">
                      <div className="stage-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="card">
          <h2>Deal Stage Control</h2>
          <p className="muted-line">
            Current: <strong>{selectedDeal ? selectedDeal.stage : "No deal selected"}</strong>
          </p>
          <form onSubmit={updateDealStage} className="stack-form">
            <select value={targetStage} onChange={(e) => setTargetStage(e.target.value)}>
              {stageOptions.map((stage) => (
                <option value={stage} key={stage}>
                  {stage}
                </option>
              ))}
            </select>
            <button type="submit" disabled={busy === "stage"}>
              {busy === "stage" ? "Updating..." : "Update Stage"}
            </button>
          </form>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Create Deal</h2>
          <form onSubmit={createDeal} className="stack-form">
            <input name="name" placeholder="Deal name" required />
            <input name="description" placeholder="Description" />
            <button type="submit" disabled={busy === "deal"}>
              {busy === "deal" ? "Creating..." : "Create"}
            </button>
          </form>
          <h3>Deals ({deals.length})</h3>
          <div className="dashboard-toolbar">
            <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
              <option value="All">All stages</option>
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            <input
              placeholder="Search deals by id/name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="button" onClick={exportDealsCsv}>
              Export CSV
            </button>
          </div>
          <div className="field-row">
            <label htmlFor="active-deal">Active deal for upload/query</label>
            <select
              id="active-deal"
              value={selectedDealId}
              onChange={(e) => setSelectedDealId(e.target.value)}
            >
              <option value="">Select a deal</option>
              {deals.slice(0, 100).map((deal) => (
                <option key={deal.id} value={deal.id}>
                  #{deal.id} {deal.name}
                </option>
              ))}
            </select>
          </div>
          <ul className="list">
            {filteredDeals.map((d) => (
              <li key={d.id}>
                #{d.id} {d.name} - {d.stage}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2>Create Contact</h2>
          <form onSubmit={createContact} className="stack-form">
            <input name="full_name" placeholder="Full name" required />
            <input name="email" placeholder="Email" />
            <input name="contact_type" placeholder="investor/broker" defaultValue="investor" />
            <input name="deal_id" placeholder="Deal ID" />
            <button type="submit" disabled={busy === "contact"}>
              {busy === "contact" ? "Creating..." : "Create"}
            </button>
          </form>
          <h3>Contacts ({contacts.length})</h3>
          <ul className="list">
            {visibleContacts.map((c) => (
              <li key={c.id}>
                {c.full_name} ({c.contact_type})
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Deal Documents</h2>
          {selectedDealId ? (
            <ul className="list">
              {documents.length === 0 ? (
                <li>No documents uploaded for this deal yet.</li>
              ) : (
                documents.map((doc) => (
                  <li key={doc.id}>
                    {doc.filename} (doc #{doc.id})
                  </li>
                ))
              )}
            </ul>
          ) : (
            <p>Select a deal to view documents.</p>
          )}
        </div>
        <div className="card">
          <h2>Deal Notes</h2>
          <form onSubmit={addNote} className="stack-form">
            <textarea
              rows={3}
              placeholder="Add an internal diligence note for the selected deal..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button type="submit" disabled={busy === "note"}>
              {busy === "note" ? "Saving..." : "Add Note"}
            </button>
          </form>
          <ul className="list" style={{ marginTop: 12 }}>
            {notes.length === 0 ? (
              <li>No notes yet.</li>
            ) : (
              notes.map((note) => (
                <li key={note.id}>
                  <strong>{note.author}:</strong> {note.content}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="card wide-card">
        <h2>Activity Timeline</h2>
        <ul className="list">
          {activities.length === 0 ? (
            <li>No activity yet for this deal.</li>
          ) : (
            activities.map((a, idx) => (
              <li key={`${a.kind}-${idx}`}>
                <strong>[{a.kind.toUpperCase()}]</strong> {a.text}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="card wide-card">
        <h2>Document Upload + AI Query</h2>
        <form onSubmit={uploadDocument} className="inline-form">
          <input name="deal_id" placeholder={`Deal ID (default: ${selectedDealId || "none"})`} />
          <input name="file" type="file" required />
          <button type="submit" disabled={busy === "upload"}>
            {busy === "upload" ? "Uploading..." : "Upload"}
          </button>
        </form>

        <form onSubmit={askQuestion} className="stack-form" style={{ marginTop: 12 }}>
          <input
            placeholder="Deal ID for query"
            value={selectedDealId}
            onChange={(e) => setSelectedDealId(e.target.value)}
          />
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} />
          <button type="submit" disabled={busy === "ask"}>
            {busy === "ask" ? "Running AI..." : "Ask AI"}
          </button>
        </form>
        <div className="answer-box ai-answer">{formatAnswer(answer)}</div>
      </section>

      <section className="card wide-card">
        <h2>AI Query History</h2>
        <ul className="list">
          {queryHistory.length === 0 ? (
            <li>No AI history for selected deal.</li>
          ) : (
            queryHistory.map((item) => (
              <li key={item.id}>
                <strong>Q:</strong> {item.question}
                <br />
                <span className="muted-line">By {item.username} · citations: {item.citations || "n/a"}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
