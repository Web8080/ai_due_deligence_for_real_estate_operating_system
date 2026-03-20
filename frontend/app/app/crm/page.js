"use client";
// Author: Victor.I
// Companies, contacts, notes, investor type, and paste-based email import until Graph/Gmail connectors are live.

import { useCallback, useEffect, useState } from "react";

import AICopilotPanel from "../../components/ai-copilot-panel";
import { useAuth } from "../../components/auth-provider";
import PageFrame from "../../components/page-frame";
import RelationshipGraph from "../../components/relationship-graph";
import { authHeaders, fetchJson, getApiBase } from "../../lib/reos-client";

const INVESTOR_TYPES = [
  "family office",
  "institutional",
  "fund of funds",
  "RIA",
  "HNWI",
  "sovereign",
  "pension",
  "endowment",
  "corporate",
  "other",
];

export default function CRMPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [overview, setOverview] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [graph, setGraph] = useState(null);
  const [deals, setDeals] = useState([]);
  const [emailSignals, setEmailSignals] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBodyBusy] = useState("");

  const [newCompany, setNewCompany] = useState({ name: "", investor_type: "", notes: "" });
  const [newContact, setNewContact] = useState({
    full_name: "",
    email: "",
    company_id: "",
    investor_type: "",
    notes: "",
  });

  const [emailRaw, setEmailRaw] = useState("");
  const [emailPreview, setEmailPreview] = useState(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailDealId, setEmailDealId] = useState("");
  const [emailOptions, setEmailOptions] = useState({ createContacts: true, applyPipeline: true });

  const headers = auth?.token ? authHeaders(auth.token) : {};

  const reload = useCallback(async () => {
    if (!auth?.token) return;
    const h = { Authorization: `Bearer ${auth.token}` };
    try {
      const [ov, co, ct, gr, dl, sg] = await Promise.all([
        fetchJson(`${API}/crm/overview`, { headers: h }),
        fetchJson(`${API}/crm/companies`, { headers: h }),
        fetchJson(`${API}/crm/contacts`, { headers: h }),
        fetchJson(`${API}/crm/graph`, { headers: h }).catch(() => ({ nodes: [], edges: [] })),
        fetchJson(`${API}/deals`, { headers: h }),
        fetchJson(`${API}/crm/email-signals`, { headers: h }).catch(() => []),
      ]);
      setOverview(ov);
      setCompanies(co);
      setContacts(ct);
      setGraph(gr);
      setDeals(dl);
      setEmailSignals(sg);
    } catch (e) {
      setMessage(e.message || "Failed to load CRM data");
    }
  }, [API, auth?.token]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function saveCompanyPatch(id, patch) {
    setBodyBusy(`co-${id}`);
    try {
      await fetchJson(`${API}/crm/companies/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(patch),
      });
      await reload();
    } catch (e) {
      setMessage(e.message || "Save failed");
    } finally {
      setBodyBusy("");
    }
  }

  async function createCompany(e) {
    e.preventDefault();
    setBodyBusy("new-co");
    try {
      await fetchJson(`${API}/crm/companies`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newCompany.name.trim(),
          investor_type: newCompany.investor_type || null,
          notes: newCompany.notes || null,
        }),
      });
      setNewCompany({ name: "", investor_type: "", notes: "" });
      await reload();
    } catch (e) {
      setMessage(e.message || "Could not add company");
    } finally {
      setBodyBusy("");
    }
  }

  async function createContact(e) {
    e.preventDefault();
    const co = companies.find((c) => String(c.id) === String(newContact.company_id));
    setBodyBusy("new-ct");
    try {
      await fetchJson(`${API}/crm/contacts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          full_name: newContact.full_name.trim(),
          email: newContact.email.trim() || null,
          company_name: co ? co.name : null,
          investor_type: newContact.investor_type || null,
          contact_type: "investor",
          notes: newContact.notes || null,
        }),
      });
      setNewContact({ full_name: "", email: "", company_id: "", investor_type: "", notes: "" });
      await reload();
    } catch (e) {
      setMessage(e.message || "Could not add contact");
    } finally {
      setBodyBusy("");
    }
  }

  async function saveContactNotes(id, notes) {
    setBodyBusy(`ct-${id}`);
    try {
      await fetchJson(`${API}/crm/contacts/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ notes }),
      });
      await reload();
    } catch (e) {
      setMessage(e.message || "Update failed");
    } finally {
      setBodyBusy("");
    }
  }

  async function runEmailPreview() {
    setBodyBusy("email-prev");
    setEmailPreview(null);
    try {
      const res = await fetchJson(`${API}/crm/email-import/preview`, {
        method: "POST",
        headers,
        body: JSON.stringify({ raw_text: emailRaw }),
      });
      setEmailPreview(res);
    } catch (e) {
      setMessage(e.message || "Preview failed");
    } finally {
      setBodyBusy("");
    }
  }

  async function commitEmailImport() {
    if (!emailPreview?.detected?.length) return;
    setBodyBusy("email-commit");
    try {
      const dealId = emailDealId ? parseInt(emailDealId, 10) : null;
      const items = emailPreview.detected.map((d) => ({
        email: d.email,
        full_name: d.full_name_guess || d.email.split("@")[0],
        company_name: d.company_guess || null,
        investor_type: null,
        decision_hint: d.decision_hint,
      }));
      const res = await fetchJson(`${API}/crm/email-import/commit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          deal_id: Number.isFinite(dealId) ? dealId : null,
          subject: emailSubject || null,
          body_excerpt: emailRaw.slice(0, 4000) || null,
          create_contacts: emailOptions.createContacts,
          apply_pipeline: emailOptions.applyPipeline && Number.isFinite(dealId),
          items,
        }),
      });
      setMessage(res.message || "Import complete");
      setEmailPreview(null);
      setEmailRaw("");
      await reload();
    } catch (e) {
      setMessage(e.message || "Import failed");
    } finally {
      setBodyBusy("");
    }
  }

  return (
    <PageFrame
      eyebrow="CRM"
      title="Contacts, companies, and investor email signals"
      subtitle="Track who you are speaking with, firm-level notes and investor type, and paste email threads to capture intent. Mailbox API sync is separate—wire Graph or Gmail when ready."
    >
      {message ? <p className="inline-alert alert-error">{message}</p> : null}

      <p className="muted-copy">{overview?.email_integration_hint}</p>

      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <h2>Add company</h2>
          <form className="stack-form" onSubmit={createCompany}>
            <input
              value={newCompany.name}
              onChange={(e) => setNewCompany((s) => ({ ...s, name: e.target.value }))}
              placeholder="Company name"
              required
            />
            <select
              value={newCompany.investor_type}
              onChange={(e) => setNewCompany((s) => ({ ...s, investor_type: e.target.value }))}
              aria-label="Investor type"
            >
              <option value="">Investor type (optional)</option>
              {INVESTOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <textarea
              value={newCompany.notes}
              onChange={(e) => setNewCompany((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Relationship notes (mandate, history, touchpoints)"
              rows={3}
            />
            <button type="submit" disabled={busy === "new-co"}>
              Save company
            </button>
          </form>
        </article>

        <article className="surface-card">
          <h2>Add contact</h2>
          <form className="stack-form" onSubmit={createContact}>
            <input
              value={newContact.full_name}
              onChange={(e) => setNewContact((s) => ({ ...s, full_name: e.target.value }))}
              placeholder="Full name"
              required
            />
            <input
              value={newContact.email}
              onChange={(e) => setNewContact((s) => ({ ...s, email: e.target.value }))}
              placeholder="Email"
              type="email"
            />
            <select
              value={newContact.company_id}
              onChange={(e) => setNewContact((s) => ({ ...s, company_id: e.target.value }))}
              aria-label="Company"
            >
              <option value="">Company (optional)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.contact_count} contacts)
                </option>
              ))}
            </select>
            <select
              value={newContact.investor_type}
              onChange={(e) => setNewContact((s) => ({ ...s, investor_type: e.target.value }))}
              aria-label="Contact investor type"
            >
              <option value="">Investor type (optional)</option>
              {INVESTOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <textarea
              value={newContact.notes}
              onChange={(e) => setNewContact((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Contact-level notes"
              rows={2}
            />
            <button type="submit" disabled={busy === "new-ct"}>
              Save contact
            </button>
          </form>
        </article>
      </section>

      <section className="content-grid single-column">
        <article className="surface-card">
          <h2>Companies you track</h2>
          <p className="muted-copy">Edit notes and investor type per firm. Contacts roll up under each company.</p>
          <div className="crm-company-list">
            {companies.length === 0 ? (
              <p className="muted-copy">No companies yet.</p>
            ) : (
              companies.map((c) => (
                <div key={c.id} className="crm-company-card">
                  <div className="crm-company-head">
                    <strong>{c.name}</strong>
                    <span className="muted-copy">
                      {c.contact_count} contact{c.contact_count === 1 ? "" : "s"} / {c.company_type}
                    </span>
                  </div>
                  <label className="field-label">Investor type</label>
                  <select
                    defaultValue={c.investor_type || ""}
                    key={`${c.id}-it-${c.investor_type}`}
                    onChange={(e) => saveCompanyPatch(c.id, { investor_type: e.target.value || null })}
                    disabled={busy === `co-${c.id}`}
                  >
                    <option value="">Not set</option>
                    {INVESTOR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <label className="field-label">Company notes</label>
                  <textarea
                    defaultValue={c.notes || ""}
                    key={`${c.id}-notes-${c.notes?.slice(0, 12)}`}
                    rows={3}
                    className="crm-notes-area"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (c.notes || "")) saveCompanyPatch(c.id, { notes: v || null });
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="content-grid single-column">
        <article className="surface-card">
          <h2>Contacts</h2>
          <div className="crm-table-wrap">
            <table className="playbook-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Investor type</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((ct) => (
                  <tr key={ct.id}>
                    <td>{ct.full_name}</td>
                    <td>{ct.email || "—"}</td>
                    <td>{ct.company_name || "—"}</td>
                    <td>{ct.investor_type || "—"}</td>
                    <td>
                      <textarea
                        className="crm-inline-notes"
                        defaultValue={ct.notes || ""}
                        rows={2}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v !== (ct.notes || "")) saveContactNotes(ct.id, v || null);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="content-grid single-column">
        <article className="surface-card">
          <h2>Import from email (paste)</h2>
          <p className="muted-copy">
            Forward or paste a thread. The server extracts addresses and infers a coarse decision (committed / interested / pass /
            follow-up) from wording—not legal advice and not a substitute for IC records.
          </p>
          <input
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Subject line (stored on the signal)"
            className="crm-subject-input"
          />
          <select value={emailDealId} onChange={(e) => setEmailDealId(e.target.value)} aria-label="Link to deal for pipeline">
            <option value="">Deal for pipeline updates (optional)</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.stage})
              </option>
            ))}
          </select>
          <label className="crm-check">
            <input
              type="checkbox"
              checked={emailOptions.createContacts}
              onChange={(e) => setEmailOptions((o) => ({ ...o, createContacts: e.target.checked }))}
            />
            Create missing contacts
          </label>
          <label className="crm-check">
            <input
              type="checkbox"
              checked={emailOptions.applyPipeline}
              onChange={(e) => setEmailOptions((o) => ({ ...o, applyPipeline: e.target.checked }))}
            />
            Apply pipeline status when a deal is selected
          </label>
          <textarea
            value={emailRaw}
            onChange={(e) => setEmailRaw(e.target.value)}
            placeholder="Paste full email headers and body..."
            rows={10}
            className="crm-email-paste"
          />
          <div className="crm-email-actions">
            <button type="button" onClick={runEmailPreview} disabled={busy === "email-prev" || !emailRaw.trim()}>
              Preview extraction
            </button>
            <button type="button" onClick={commitEmailImport} disabled={busy === "email-commit" || !emailPreview?.detected?.length}>
              Commit to CRM
            </button>
          </div>
          {emailPreview?.integration_note ? <p className="muted-copy">{emailPreview.integration_note}</p> : null}
          {emailPreview?.detected?.length ? (
            <ul className="crm-detected-list">
              {emailPreview.detected.map((d, i) => (
                <li key={`${d.email}-${i}`}>
                  <strong>{d.email}</strong> — {d.full_name_guess || "name unknown"} — decision: {d.decision_hint}.{" "}
                  <span className="muted-copy">{d.rationale}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </section>

      <section className="content-grid single-column">
        <article className="surface-card">
          <h2>Recent email signals</h2>
          {emailSignals.length === 0 ? (
            <p className="muted-copy">No stored signals yet. Run a paste import above.</p>
          ) : (
            <ul className="crm-signal-feed">
              {emailSignals.map((s) => (
                <li key={s.id}>
                  <span className="crm-signal-badge">{s.decision_inferred}</span> {s.sender_email}{" "}
                  {s.subject_line ? `— ${s.subject_line}` : ""}
                  <span className="muted-copy"> ({s.created_by})</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="content-grid single-column">
        <article className="surface-card">
          <h2>Relationship graph</h2>
          <RelationshipGraph nodes={graph?.nodes || []} edges={graph?.edges || []} />
        </article>
      </section>

      <section className="content-grid two-column-grid">
        <article className="surface-card">
          <h2>Relationship signals</h2>
          <div className="signal-list">
            {(overview?.relationship_signals || []).map((item, idx) => (
              <div key={idx} className="signal-row">
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="feature-copy">{overview?.ai_briefing}</p>
        </article>

        <AICopilotPanel
          workspace="crm"
          title="Relationship copilot"
          defaultPrompt="Given our contacts and companies, where is coverage thin and what follow-ups matter this week?"
        />
      </section>
    </PageFrame>
  );
}
