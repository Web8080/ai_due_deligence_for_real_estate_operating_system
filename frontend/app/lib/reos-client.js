"use client";

export function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:8000`;
  return "http://localhost:8000";
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
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatApiError(payload));
  }
  return payload;
}
