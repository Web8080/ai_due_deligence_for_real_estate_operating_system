"use client";

import { useMemo, useState } from "react";

import { useAuth } from "../../components/auth-provider";
import PageFrame from "../../components/page-frame";
import { authHeaders, fetchJson, getApiBase } from "../../lib/reos-client";

const importModes = [
  { id: "deals_contacts", label: "Deals + Contacts" },
  { id: "investor_pipeline", label: "Investor Pipeline" },
  { id: "document_index", label: "Document Index" },
];

export default function ImportPage() {
  const API = getApiBase();
  const { auth } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const rawExamples = {
    deals_contacts:
      "deal_name,description,asset_type,city,state,source,priority,owner_name,next_action,contact_full_name,contact_email,contact_type,company_name,investor_type\nUnion Station Office,Core office deal,office,Denver,CO,Broker referral,high,analyst1,Review OM,Jordan Vale,jordan@example.com,investor,Peak River Capital,family office",
    investor_pipeline:
      "deal_name,contact_email,status,commitment_amount,conviction,last_signal,next_action\nUnion Station Office,jordan@example.com,interested,500000,high,Requested IC memo,Schedule follow-up call",
    document_index:
      "deal_name,filename,document_type,summary,risk_tags,content\nUnion Station Office,union_station_om.txt,offering_memo,Core office summary,lease_roll,Imported metadata content",
  };

  const headers = useMemo(() => authHeaders(auth?.token, null), [auth?.token]);

  async function uploadImport(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const importType = form.get("import_type");
    const file = form.get("file");
    if (!file || typeof file === "string") return;
    setBusy(String(importType));
    try {
      const req = new FormData();
      req.append("file", file);
      const data = await fetchJson(`${API}/imports/csv?import_type=${encodeURIComponent(String(importType))}`, {
        method: "POST",
        headers,
        body: req,
      });
      setMessage(`Imported ${data.rows_imported} rows for ${data.import_type}.`);
      e.currentTarget.reset();
    } catch (error) {
      setMessage(error.message || "Import failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <PageFrame
      eyebrow="AI & Documents"
      title="Import center"
      subtitle="Load spreadsheet data into deals, investor pipeline, and document metadata so the enterprise shell starts from real operating context."
    >
      {message ? <p className="inline-alert">{message}</p> : null}
      <section className="content-grid three-column-grid">
        {importModes.map((mode) => (
          <div className="surface-card" key={mode.id}>
            <h2>{mode.label}</h2>
            <p className="muted-copy">Upload a CSV or XLSX file using the field order shown below.</p>
            <form onSubmit={uploadImport} className="stack-form">
              <input type="hidden" name="import_type" value={mode.id} />
              <input name="file" type="file" accept=".csv,.xlsx" required />
              <button type="submit" disabled={busy === mode.id}>
                {busy === mode.id ? "Importing..." : `Import ${mode.label}`}
              </button>
            </form>
            <div className="code-card enterprise-code">
              <pre>{rawExamples[mode.id]}</pre>
            </div>
          </div>
        ))}
      </section>
    </PageFrame>
  );
}
