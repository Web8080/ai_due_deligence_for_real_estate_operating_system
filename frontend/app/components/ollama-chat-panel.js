"use client";
// Author: Victor.I

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { authHeaders, fetchJson, getApiBase } from "../lib/reos-client";
import { useAuth } from "./auth-provider";

const WORKSPACE_BY_PATH = {
  "/app": "portfolio",
  "/app/deals": "deals",
  "/app/leads": "leads",
  "/app/crm": "crm",
  "/app/investors": "investors",
  "/app/documents": "documents",
  "/app/operations": "operations",
  "/app/reports": "portfolio",
  "/app/governance": "operations",
  "/app/admin": "portfolio",
  "/app/import": "documents",
  "/app/integrations": "operations",
  "/app/strategy": "operations",
};

function getWorkspace(pathname) {
  if (!pathname) return "portfolio";
  for (const [path, workspace] of Object.entries(WORKSPACE_BY_PATH)) {
    if (pathname === path || pathname.startsWith(path + "/")) return workspace;
  }
  return "portfolio";
}

export default function OllamaChatPanel() {
  const pathname = usePathname();
  const { auth } = useAuth();
  const API = getApiBase();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const workspace = useMemo(() => getWorkspace(pathname), [pathname]);
  const headers = useMemo(() => authHeaders(auth?.token), [auth?.token]);

  const sendMessage = useCallback(
    async (e) => {
      e.preventDefault();
      const text = (prompt || "").trim();
      if (!text || busy) return;
      setPrompt("");
      setError("");
      setMessages((prev) => [...prev, { role: "user", text }]);
      setBusy(true);
      try {
        const payload = await fetchJson(`${API}/ai/copilot`, {
          method: "POST",
          headers,
          body: JSON.stringify({ workspace, prompt: text }),
        });
        const answer = payload.answer || "";
        setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
      } catch (err) {
        setError(err.message || "Request failed");
        setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${err.message}` }]);
      } finally {
        setBusy(false);
      }
    },
    [API, headers, workspace, prompt, busy]
  );

  if (!auth?.token) return null;

  return (
    <>
      <button
        type="button"
        className="ollama-chat-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open Ollama chat"}
        title="Ollama chat"
      >
        {open ? "\u2715" : "Chat"}
      </button>
      <aside className={`ollama-chat-panel ${open ? "ollama-chat-panel-open" : ""}`}>
        <div className="ollama-chat-head">
          <h2>Ollama</h2>
          <button type="button" className="ollama-chat-close" onClick={() => setOpen(false)} aria-label="Close">
            {"\u2715"}
          </button>
        </div>
        <p className="ollama-chat-context">Context: {workspace}</p>
        <div className="ollama-chat-messages">
          {messages.length === 0 ? (
            <p className="ollama-chat-placeholder">Ask about this page. Replies use the workspace AI (Ollama).</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`ollama-chat-msg ollama-chat-msg-${m.role}`}>
                {m.text}
              </div>
            ))
          )}
        </div>
        {error ? <p className="ollama-chat-error">{error}</p> : null}
        <form className="ollama-chat-form" onSubmit={sendMessage}>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask something..."
            disabled={busy}
          />
          <button type="submit" disabled={busy}>
            {busy ? "..." : "Send"}
          </button>
        </form>
      </aside>
    </>
  );
}
