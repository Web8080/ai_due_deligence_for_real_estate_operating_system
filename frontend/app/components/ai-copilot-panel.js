"use client";

import { useMemo, useState } from "react";

import { authHeaders, fetchJson, getApiBase } from "../lib/reos-client";
import { useAuth } from "./auth-provider";

export default function AICopilotPanel({
  workspace,
  title = "AI Copilot",
  promptLabel = "Ask the operating copilot",
  defaultPrompt,
  dealId,
}) {
  const API = getApiBase();
  const { auth } = useAuth();
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const headers = useMemo(() => authHeaders(auth?.token), [auth?.token]);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = await fetchJson(`${API}/ai/copilot`, {
        method: "POST",
        headers,
        body: JSON.stringify({ workspace, prompt, deal_id: dealId }),
      });
      setAnswer(payload.answer || "");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="surface-card ai-panel">
      <div className="panel-head">
        <div>
          <p className="section-eyebrow">AI Assist</p>
          <h2>{title}</h2>
        </div>
      </div>
      <form className="stack-form" onSubmit={onSubmit}>
        <label className="field-label">{promptLabel}</label>
        <textarea rows={4} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <button type="submit" disabled={busy}>
          {busy ? "Running analysis..." : "Run copilot"}
        </button>
      </form>
      {error ? <p className="inline-alert alert-error">{error}</p> : null}
      <div className="ai-answer">
        {answer ? <p>{answer}</p> : <p className="muted-copy">Run a workspace question to generate a focused operating brief.</p>}
      </div>
    </article>
  );
}
