"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "../../components/app-shell";
import { authHeaders, clearStoredAuth, getApiBase, getStoredAuth } from "../../lib/reos-client";

const importModes = [
  { id: "deals_contacts", label: "Deals + Contacts" },
  { id: "investor_pipeline", label: "Investor Pipeline" },
  { id: "document_index", label: "Document Index" },
];

export default function ImportPage() {
  const API = getApiBase();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
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

  const headers = useMemo(() => authHeaders(token, null), [token]);

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
      const res = await fetch(`${API}/imports/csv?import_type=${encodeURIComponent(String(importType))}`, {
        method: "POST",
        headers,
        body: req,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.detail || "Import failed.");
        return;
      }
      setMessage(`Imported ${data.rows_imported} rows for ${data.import_type}.`);
      e.currentTarget.reset();
    } finally {
      setBusy("");
    }
  }

  function logout() {
    clearStoredAuth();
    router.push("/login");
  }

  return (
    <AppShell
      title="Import Center"
      subtitle="Load local CSV spreadsheets for deals, investor pipeline, and document metadata before external APIs are connected."
      username={username}
      role={role}
      onLogout={logout}
    >
      {message ? <p className="message">{message}</p> : null}
      <section className="grid">
        {importModes.map((mode) => (
          <div className="card" key={mode.id}>
            <h2>{mode.label}</h2>
            <p className="muted-line">Upload a CSV file using the template shown below.</p>
            <form onSubmit={uploadImport} className="stack-form">
              <input type="hidden" name="import_type" value={mode.id} />
              <input name="file" type="file" accept=".csv" required />
              <button type="submit" disabled={busy === mode.id}>
                {busy === mode.id ? "Importing..." : `Import ${mode.label}`}
              </button>
            </form>
            <div className="code-card">
              <pre>{rawExamples[mode.id]}</pre>
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
