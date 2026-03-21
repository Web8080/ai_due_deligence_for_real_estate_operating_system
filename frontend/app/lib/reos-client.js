"use client";

/**
 * API base for fetch().
 * - Default in the browser: same-origin proxy `/api/reos` (see next.config.mjs rewrites) so CORS and LAN hostnames do not break calls.
 * - Override with NEXT_PUBLIC_API_BASE_URL when the UI must talk to a separate API host (production or custom dev).
 */
export function getApiBase() {
  const explicit = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;
  if (typeof window !== "undefined") return "/api/reos";
  return (process.env.REOS_INTERNAL_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

export function getStoredAuth() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem("reos_auth") || window.localStorage.getItem("reos_auth");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeAuth(auth) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem("reos_auth", JSON.stringify(auth));
  window.localStorage.removeItem("reos_auth");
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem("reos_auth");
  window.localStorage.removeItem("reos_auth");
}

export function authHeaders(token, contentType = "application/json") {
  if (!token) return {};
  if (!contentType) return { Authorization: `Bearer ${token}` };
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": contentType,
  };
}

function formatApiError(payload) {
  const detail = payload?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) return String(item.msg);
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      })
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  if (detail && typeof detail === "object") {
    try {
      return JSON.stringify(detail);
    } catch {
      return "Request failed";
    }
  }
  return payload?.message || "Request failed";
}

export async function fetchJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    const base = typeof window !== "undefined" ? getApiBase() : "";
    const hint =
      base === "/api/reos"
        ? " Check that the Next dev server can reach the API (REOS_API_PROXY_TARGET in .env.local defaults to http://127.0.0.1:8000)."
        : " Check that the API is running, CORS allows this origin, and NEXT_PUBLIC_API_BASE_URL is correct if set.";
    throw new Error((err?.message || "Failed to fetch") + hint);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatApiError(payload));
  }
  return payload;
}
